export interface HealthBar {
  perm: { value: number; max: number };
  temp?: { value: number; max: number };
  full: { value: number; max: number };
}
