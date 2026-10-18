// Shapes returned by hillviewAssetsAPI (structs/) and hillviewCoreAPI's
// public mobile-user list. Field names match the Go json tags.

export type GeneralNSN = {
  id: number;
  name: string;
  short_name: string;
};

export type AssetUser = {
  id: number;
  name: string | null;
  email: string | null;
  nfc_identifier: string | null;
  profile_image_url: string | null;
  inserted_at: string | null;
};

export type AssetCheckout = {
  id: number;
  asset_id: number;
  checkout_status: GeneralNSN | null;
  associated_user: number | null;
  checkout_notes: string | null;
  time_out: string | null;
  time_in: string | null;
  expected_in: string | null;
  updated_at: string | null;
  user: AssetUser | null;
};

export type AssetMetadata = {
  serial_number: string | null;
  manufacturer: string | null;
  model: string | null;
  notes: string | null;
};

export type Asset = {
  id: number;
  name: string | null;
  image_url: string | null;
  identifier: string | null;
  description: string | null;
  category: GeneralNSN | null;
  status: GeneralNSN | null;
  metadata: AssetMetadata | null;
  active_tab: AssetCheckout | null;
  updated_at: string | null;
};

/** Status 1 is "Active"; anything else carries a warning (damaged, lost, …). */
export const ASSET_STATUS_OK = 1;

export type MobileUser = {
  id: number;
  name: string;
  email: string;
  nfc_identifier: string;
  profile_image_url: string;
  status?: GeneralNSN;
};

export type CheckoutRequest = {
  user_id: number;
  asset_ids: number[];
  offsite: boolean;
  /**
   * ISO timestamp of local midnight on the chosen return date, built in the
   * browser so it is the kiosk's timezone. Required when offsite.
   */
  expected_in?: string;
};

export type CheckoutResult = {
  asset_id: number;
  ok: boolean;
  error?: string;
};

export type CheckinRequest = {
  asset_id: number;
  source: "pos" | "seeker";
};
