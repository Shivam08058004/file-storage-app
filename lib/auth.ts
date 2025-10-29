import { NextAuthOptions } from "next-auth"
// import GoogleProvider from "next-auth/providers/google" // Disabled - requires payment
import CredentialsProvider from "next-auth/providers/credentials"
import { SupabaseAdapter } from "@auth/supabase-adapter"
import { supabaseAdmin } from "@/lib/supabase"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
  
  providers: [
    // Google OAuth Provider - DISABLED (requires payment verification)
    // GoogleProvider({
    //   clientId: process.env.GOOGLE_CLIENT_ID!,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    // }),
    
    // Email/Password Credentials Provider
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required")
        }

        // Find user in database
        const { data: user, error } = await supabaseAdmin
          .from("users")
          .select("*")
          .eq("email", credentials.email)
          .single()

        if (error || !user) {
          throw new Error("Invalid email or password")
        }

        // Check if user signed up with OAuth (no password)
        if (!user.password_hash) {
          throw new Error("Please sign in with Google")
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.password_hash
        )

        if (!passwordMatch) {
          throw new Error("Invalid email or password")
        }

        // Return user object
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatar_url,
        }
      }
    })
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
  },

  callbacks: {
    async jwt({ token, user, account, trigger }) {
      // Initial sign in
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.picture = user.image
        
        // Fetch email_verified status from database
        const { data: dbUser } = await supabaseAdmin
          .from("users")
          .select("email_verified, provider")
          .eq("id", user.id)
          .single()
        
        token.emailVerified = dbUser?.email_verified || dbUser?.provider === "google"
        token.provider = dbUser?.provider
      }
      
      // Store provider information
      if (account) {
        token.provider = account.provider
      }
      
      // Refresh email_verified status on token update
      if (trigger === "update" && token.id) {
        const { data: dbUser } = await supabaseAdmin
          .from("users")
          .select("email_verified")
          .eq("id", token.id as string)
          .single()
        
        token.emailVerified = dbUser?.email_verified || false
      }
      
      return token
    },
    
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.image = token.picture as string
        session.user.emailVerified = token.emailVerified as boolean
      }
      return session
    },

    async signIn({ user, account, profile }) {
      // For OAuth providers, create user if doesn't exist
      if (account?.provider === "google") {
        const { data: existingUser } = await supabaseAdmin
          .from("users")
          .select("id")
          .eq("email", user.email!)
          .single()

        if (!existingUser) {
          // Create new user
          await supabaseAdmin.from("users").insert({
            email: user.email!,
            name: user.name,
            avatar_url: user.image,
            provider: "google",
            email_verified: true,
          })
        }
      }
      return true
    }
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
}
