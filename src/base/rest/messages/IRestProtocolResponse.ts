import { IWSError } from '../../../types/IWSError';

export interface IRestProtocolResponse<TResponse> {
    id: string;
    module: string;
    isSuccess: boolean;
    error?: IWSError;
    data?: TResponse;
}
