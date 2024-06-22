export {};

declare global {
  interface CustomJwtSessionClaims {
    orgMetadata: {};
    publicMetadata: { speakerId?: string };
  }
}
