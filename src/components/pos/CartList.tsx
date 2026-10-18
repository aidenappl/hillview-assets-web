import Spinner from "@/components/Spinner";
import RemoteImage from "@/components/RemoteImage";
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
    <div className="glass-subtle max-h-[36vh] w-full overflow-y-auto rounded-2xl p-3">
      <h2 className="px-2 pt-1 pb-2 text-sm font-semibold text-ink-soft">
        Your Cart
      </h2>
      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          // The Angular kiosk compared active_tab.user.identifier, a field the
          // API never sends, so "Pending Check In" could never appear.
          const own = item.active_tab?.associated_user === studentId;
          const warned =
            item.status !== null && item.status.id !== ASSET_STATUS_OK;
          return (
            <li
              key={item.id}
              className="flex animate-[notice-in_380ms_var(--ease-spring)] items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/60"
            >
              <RemoteImage
                src={item.image_url}
                alt={item.name ?? "Asset"}
                className="size-11 rounded-xl ring-1 ring-[#e6e9f0]"
                sizes="44px"
              />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold">{item.name}</h3>
                {warned ? (
                  <p className="text-xs font-semibold text-caution">
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
                  className="flex h-9 w-28 shrink-0 cursor-pointer items-center justify-center rounded-full bg-brand text-sm font-semibold text-white shadow-[0_6px_16px_-6px_rgba(48,103,246,0.6)] transition-transform duration-200 ease-spring active:scale-95"
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
                  className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-white/80 hover:text-ink-soft [&>svg]:size-4"
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
  if (!item.active_tab)
    return <p className="text-xs font-medium text-[#17733f]">Available</p>;
  if (own)
    return (
      <p className="text-xs font-semibold text-caution">Pending Check In</p>
    );
  return (
    <p className="text-xs font-semibold text-danger">
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
      className="ml-2 cursor-pointer text-xs font-medium text-[#7a7f89] hover:underline"
    >
      {children}
    </button>
  );
}
