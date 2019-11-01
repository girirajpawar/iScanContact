import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
 
@Injectable({
  providedIn: 'root'
})
export class SummaryService {
  
    apiURL: string = 'http://cerebion.pythonanywhere.com/summary';
    //apiKey: string = 'api_key=5fbddf6b517048e25bc3ac1bbeafb919';
    summary: any;
 
    constructor(private http: HttpClient) { 
 
    }
 
    getSummary(raw_text: FormData) {
        return this.http.post<any>(`${this.apiURL}`,raw_text).pipe(
            map(model => {
                    this.summary = model;
                    return model;
                }
            )
        );  
    }
}