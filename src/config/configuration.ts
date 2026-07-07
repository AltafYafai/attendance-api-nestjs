export interface AppConfig {
  port: number;
  jwt: {
    secret: string;
    issuer: string;
  };
}

export default (): AppConfig => ({
  port: parseInt(process.env.PORT ?? '4000', 10),
  jwt: {
    secret: process.env.JWT_SECRET as string,
    issuer: process.env.JWT_ISSUER ?? 'attendance-auth',
  },
});
