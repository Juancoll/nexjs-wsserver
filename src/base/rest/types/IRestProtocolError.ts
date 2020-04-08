import { IWSError } from '../../../types/IWSError';
import { IRestProtocolRequest } from '../messages/IRestProtocolRequest';

export interface IRestProtocolError {
    request: IRestProtocolRequest<any>;
    error: IWSError;
}
