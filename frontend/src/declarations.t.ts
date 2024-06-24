declare module "*.png" {
  const value: any;
  export default value;
}
declare module "*.gif" {
  const value: any;
  export default value;
}
declare module 'uuid' {
  export const v4: () => string;
}