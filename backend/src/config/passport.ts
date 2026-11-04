import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { config } from './env.js';
import { prisma } from './db.js';

// Serialize user ID to session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from database
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        slackIntegration: true,
      },
    });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Configure Google OAuth Strategy if credentials exist
if (config.google.clientId && config.google.clientSecret && config.google.clientId !== 'your_google_client_id_here') {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.google.clientId,
        clientSecret: config.google.clientSecret,
        callbackURL: config.google.callbackUrl,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('No email found from Google profile'), undefined);
          }

          const name = profile.displayName || email.split('@')[0];
          const avatar = profile.photos?.[0]?.value || null;

          // Upsert user in database
          let user = await prisma.user.findUnique({
            where: { googleId: profile.id },
          });

          if (!user) {
            user = await prisma.user.upsert({
              where: { email },
              update: {
                googleId: profile.id,
                name,
                avatar,
              },
              create: {
                googleId: profile.id,
                name,
                email,
                avatar,
              },
            });

            // Automatically create default sender record for this user
            await prisma.sender.upsert({
              where: {
                userId_email: {
                  userId: user.id,
                  email: user.email,
                },
              },
              update: {},
              create: {
                userId: user.id,
                email: user.email,
              },
            });
          }

          return done(null, user);
        } catch (error) {
          return done(error as Error, undefined);
        }
      }
    )
  );
}

export default passport;

