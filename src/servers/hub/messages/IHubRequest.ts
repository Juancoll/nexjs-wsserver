export interface IHubRequest {
    service: string;
    method: string;
    eventName: string;
    credentials: any;
}
