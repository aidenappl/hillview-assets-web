import Spinner from "@/components/Spinner";
import { ASSET_STATUS_OK, type Asset } from "@/types";

export type CartItem = Asset & { checkingIn?: boolean };

type CartListProps = {
  items: CartItem[];
  /** The student at the kiosk: their own checked-out items can be returned here. */
  studentId: number;
  onRemove: (id: number) => void;
  onCheckin: (item: CartItem) => void;
  onView: (item: CartItem) => void;
};

export default function CartList({
  items,
  studentId,
  onRemove,
  onCheckin,
  onView,
}: CartListProps) {
  return (
    <div className="mt-10 max-h-[32vh] w-full overflow-y-auto rounded-md border-2 border-line p-5 shadow-[0_0_10px_0_#00000008]">
      <h2 className="pb-[10px] text-[23px] font-semibold text-ink-soft">
        Your Cart
      </h2>
      <ul className="flex flex-col gap-5">
        {items.map((item) => {
          // The Angular kiosk compared active_tab.user.identifier, a field the
          // API never sends, so "Pending Check In" could never appear.
          const own = item.active_tab?.associated_user === studentId;
          const warned =
            item.status !== null && item.status.id !== ASSET_STATUS_OK;
          return (
            <li key={item.id} className="flex h-[50px] items-center gap-5">
              <div
                className="size-[50px] shrink-0 rounded-[5px] bg-[#bec1e53d] bg-cover bg-center"
                style={
                  item.image_url
                    ? { backgroundImage: `url("${item.image_url}")` }
                    : undefined
                }
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-bold">{item.name}</h3>
                {warned ? (
                  <p className="font-semibold text-caution">
                    {item.status?.name}
                    <LinkButton onClick={() => onView(item)}>
                      View Alert
                    </LinkButton>
                  </p>
                ) : (
                  <ItemStatus item={item} own={own} onView={onView} />
                )}
              </div>
              {own ? (
                <button
                  type="button"
                  disabled={item.checkingIn}
                  onClick={() => onCheckin(item)}
                  className="flex h-10 w-[130px] shrink-0 cursor-pointer items-center justify-center rounded-[3px] bg-[#2f67f5] text-white"
                >
                  {item.checkingIn ? (
                    <Spinner className="size-5!" />
                  ) : (
                    "Check In"
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  aria-label={`Remove ${item.name ?? "asset"}`}
                  onClick={() => onRemove(item.id)}
                  className="size-[27px] shrink-0 cursor-pointer"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ItemStatus({
  item,
  own,
  onView,
}: {
  item: CartItem;
  own: boolean;
  onView: (item: CartItem) => void;
}) {
  if (!item.active_tab) return <p>Available</p>;
  if (own)
    return <p className="font-semibold text-caution">Pending Check In</p>;
  return (
    <p className="font-semibold text-danger">
      Unavailable
      <LinkButton onClick={() => onView(item)}>View Info</LinkButton>
    </p>
  );
}

function LinkButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ml-[10px] cursor-pointer text-[15px] font-medium text-[#7a7f89] hover:underline"
    >
      {children}
    </button>
  );
}
