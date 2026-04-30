export interface ManualImage {
  filename: string;
  url: string;
  source: string;
  page: number;
  label: string;
  type: "diagram" | "text";
}
export declare const MANUAL_IMAGES: ManualImage[];
