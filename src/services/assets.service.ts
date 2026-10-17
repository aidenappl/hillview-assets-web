import { fetchApi } from "@/services/api.service";
import type {
  Asset,
  AssetCheckout,
  AssetUser,
  CheckinRequest,
  CheckoutRequest,
  CheckoutResult,
  MobileUser,
} from "@/types";

export const reqSearchStudents = (q: string) =>
  fetchApi<MobileUser[]>({
    method: "GET",
    url: "/users/search",
    params: { q },
  });

export const reqGetStudent = (tag: string) =>
  fetchApi<AssetUser>({
    method: "GET",
    url: `/users/${encodeURIComponent(tag)}`,
  });

export const reqGetAsset = (tag: string) =>
  fetchApi<Asset>({ method: "GET", url: `/assets/${encodeURIComponent(tag)}` });

export const reqGetAssetHistory = (tag: string) =>
  fetchApi<AssetCheckout[]>({
    method: "GET",
    url: `/assets/${encodeURIComponent(tag)}/history`,
  });

export const reqCheckout = (data: CheckoutRequest) =>
  fetchApi<CheckoutResult[]>({ method: "POST", url: "/checkout", data });

export const reqCheckin = (data: CheckinRequest) =>
  fetchApi<{ asset_id: number }>({ method: "POST", url: "/checkin", data });
