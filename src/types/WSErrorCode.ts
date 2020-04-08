export enum WSErrorCode {
    none = 0,
    ws_restprotocol_error = 1,

    ws_auth_error = 10,
    ws_auth_invalid_data = 11,
    ws_auth_invalid_token = 12,
    ws_auth_invalid_credentials = 13,

    ws_hub_error = 20,
    ws_hub_auth_required = 21,
    ws_hub_auth_invalid_role = 22,
    ws_hub_auth_credentials_error = 23,
    ws_hub_subscribe_error = 24,
    ws_hub_unsubscribe_error = 25,

    ws_rest_auth_required = 30,
    ws_rest_auth_invalid_role = 31,
    ws_rest_auth_credentials_error = 32,
    ws_rest_method_error = 33,
}
