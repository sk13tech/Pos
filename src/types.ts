export interface Product {
  id: string;
  item: string;
  rate: number;
  mrp: number;
  ean: string;
}

export interface BillItem {
  product: Product;
  qty: number;
}

export interface Bill {
  id: string;
  billNo: string;
  date: string;
  time: string;
  customerName: string;
  items: BillItem[];
  total: number;
}

export type TabId = 'create' | 'inventory' | 'template' | 'settings';

export type MarginSetting = number;
