export type VenueActionState = {
  ok: boolean;
  error: string | null;
};

export const initialVenueActionState: VenueActionState = {
  ok: false,
  error: null,
};
