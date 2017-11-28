export default interface IOrderData {
    time: string;
    memo: string;
    description: string;
    orderId?: string;
    tradeNo: string;
    username: string;
    amount: number;
    status: string;
    sig?: string;
    version?: string;
};
