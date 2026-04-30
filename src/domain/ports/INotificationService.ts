import { Subscriber } from "../entities/Subscriber";
import { Vacancy } from "../entities/Vacancy";

export interface INotificationService {
    // the contract just says
    sendVacancyAlert(subscriber: Subscriber, vacancy: Vacancy): Promise<void>;
}