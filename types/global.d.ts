export {};

declare global {
  interface CustomJwtSessionClaims {
    orgMetadata: {};
    publicMetadata: { speakerId?: string };
  }
  interface UserPublicMetadata {
    speakerId?: string;
  }
}
