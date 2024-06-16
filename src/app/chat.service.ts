import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  constructor(private http: HttpClient) {}

  sendMessage(message: string): Observable<any> {
    console.log('sending message: ', message);
    return this.http.get<any>(`http://localhost:3010/bot?message=${message}`);
  }
}