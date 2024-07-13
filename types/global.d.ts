export {};

declare global {
  interface CustomJwtSessionClaims {
    orgMetadata: {};
    publicMetadata: UserPublicMetadata;
  }
  interface UserPublicMetadata {
    speakerId?: string;
    role?: 'admin';
  }
}
