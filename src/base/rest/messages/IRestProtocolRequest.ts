export interface IRestProtocolRequest<TRequest> {
    id: string;
    module: string;
    data?: TRequest;
}
