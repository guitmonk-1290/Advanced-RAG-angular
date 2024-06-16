import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from "@angular/material/icon"
import { MatButtonModule } from "@angular/material/button"
import { MatCheckboxModule } from "@angular/material/checkbox"
import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked ,Input } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpHeaders } from "@angular/common/http"
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Observable, lastValueFrom } from 'rxjs';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

// chat message interface
interface ChatMessage {
  text: any;
  user: boolean;
  date?: boolean;
  tables?: string[];
  loading?: boolean;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatCheckboxModule],
  templateUrl: './chatbot.component.html',
  styleUrl: './chatbot.component.css'
})
export class ChatbotComponent implements OnInit, AfterViewChecked {
  
  // Input string representing the logged-in username.
  @Input() user: string = 'Aditya';

  // Toggling chatbot UI
  isChatOpen: boolean = false;

  // reference to the message container in UI
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  // array to store chat messages
  messages: ChatMessage[] = [];

  // final selected tables
  selectedTables: string[] = []

  // handling user string input
  userInput: string = '';

  // loading state
  isLoading: boolean = false;

  // table selection state
  tableSelection: boolean = false;

  // for preventing any unsafe HTML
  formattedResponse: SafeHtml = '';

  // backend server URL -> for getting the response from LLM model
  tableURL = "http://127.0.0.1:3010/get_tables";
  resURL = "http://127.0.0.1:3010/get_response"

  // backend data-view url -> for displaying the detailed result
  dataURL = "http://127.0.0.1:3010/data";

  constructor(
    private http: HttpClient, 
    private sanitizer: DomSanitizer,
    private cdRef: ChangeDetectorRef  
  ) {}

  ngOnInit() {
    this.messages.push({ text: this.getDate(), user: false, date: true })
    this.messages.push({ text: 'Ask me anything about your data', user: false })
    // this.messages.push({
    //   text: 'Select the tables associated with your query',
    //   user: false,
    //   tables: ["lead_managements", "clients", "ticket_managements"]
    // })
  }

  // After angular updates the view
  ngAfterViewChecked() {
      this.scrollToBottom();
  }

  // scrolling to the most recent chat message
  private scrollToBottom(): void {
    try {
      const element = this.messagesContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    } catch(err) {
      // Error handling
    }
  }

  isSelected(table: string): boolean {
    return this.selectedTables.includes(table)
  }

  toggleSelection(table: string) {
    const index = this.selectedTables.indexOf(table)
    if (index > -1) {
      this.selectedTables.splice(index, 1)
    } else {
      this.selectedTables.push(table)
    }
  }

  toggleChatContainer() {
    this.isChatOpen = !this.isChatOpen;
    var button = document.getElementById("toggleButton");
    button!.classList.toggle("clicked");
  }

  removeNonWhitespace(str: string) {
    return str.replace(/[^\s]/g, '');
  }

  // Adjust the height of the text input 
  autoGrow(event: any): void {
    const textArea = event.target;
    textArea.style.height = 'auto';
    textArea.style.height = textArea.scrollHeight + 'px';
  }

  request(message: string, URL: string, tables?: string[]): Observable<any> {
    if (!tables) {
      console.log('sending message: ', message);
      return this.http.post<any>(`${URL}`, {message});
    }
    else {
      return this.http.post<any>(`${URL}`, {
        'inputText': message,
        'choosen_tables': tables
      })
    }
  }

  getResponse() {

    this.isLoading = true;
    this.cdRef.detectChanges();

    if (this.userInput.trim() === '') return;

    if (!this.tableSelection) {
      this.messages.push({ text: this.userInput, user: true });
      this.messages.push({ text: 'generating response...', user: false });
      try {
        this.request(this.userInput, this.tableURL)
            .subscribe(res => {
              if (res && 'tables' in res) {
                const tables = res.tables.related_tables

                // push to messages
                this.messages.pop()
                this.messages.push({
                  text: 'Select the tables associated with your query',
                  user: false,
                  tables: tables
                }) 
                this.tableSelection = true

                this.isLoading = false;
              }
            })      
      } catch (error) {
        this.messages.pop()
        this.handleError("I'm experiencing technical difficulties at the moment. Please try again later.");
        console.error(error);
      }
    }
    else {
      try {
        console.log("Selected Tables: " + this.selectedTables)
        this.request(this.userInput, this.resURL, this.selectedTables)
            .subscribe(res => {
              if (res && 'Response' in res) {
                console.log(res)
                const response = res.Response

                // push to messages
                this.messages.pop()
                this.messages.push({
                  text: response,
                  user: false,
                }) 
                this.tableSelection = true
                this.userInput = ""

                this.isLoading = false;
              }
            })      
      } catch (error) {
        this.messages.pop()
        this.handleError("I'm experiencing technical difficulties at the moment. Please try again later.");
        console.error(error);
      }
    }
  }

  handleError(errorMessage: string): void {
    // displaying error message in messageContainer
    this.messages.push({
      text: errorMessage,
      user: false
    })
  }

  formatCodeBlock(code: string): SafeHtml {
    const formattedCode = this.sanitizer.bypassSecurityTrustHtml(`<pre><code>${code}</code></pre>`);
    return formattedCode;
  }

  getDate() {
    const date = new Date();
    const formattedDate = date.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      weekday: undefined
    });
    return formattedDate;
  }
}
