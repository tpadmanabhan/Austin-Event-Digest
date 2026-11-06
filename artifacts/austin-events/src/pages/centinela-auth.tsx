import type { ReactNode } from "react";
import { Link } from "wouter";
import "./centinela.css";

/**
 * Drop-in Clerk branding values for the main app's ClerkProvider appearance prop.
 * The wrapper accepts Clerk's SignIn/SignUp component as children, keeping auth
 * initialization and routing in the owning app.
 */
export const centinelaClerkAppearance = {
  variables: {
    colorPrimary: "#286b6a",
    colorForeground: "#203a3d",
    colorMutedForeground: "#617476",
    colorBackground: "#fffdf6",
    colorInput: "#fffef9",
    colorInputForeground: "#203a3d",
    colorDanger: "#a1473c",
    colorNeutral: "#203a3d",
    fontFamily: '"DM Sans", sans-serif',
    borderRadius: "4px",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#fffdf6] rounded-none w-[440px] max-w-full overflow-hidden",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[#203a3d]",
    headerSubtitle: "text-[#617476]",
    socialButtonsBlockButtonText: "text-[#203a3d]",
    formFieldLabel: "text-[#203a3d]",
    footerActionLink: "text-[#286b6a]",
    footerActionText: "text-[#617476]",
    dividerText: "text-[#617476]",
    identityPreviewEditButton: "text-[#286b6a]",
    formFieldSuccessText: "text-[#286b6a]",
    alertText: "text-[#8d3e32]",
    logoBox: "hidden",
    logoImage: "hidden",
    socialButtonsBlockButton: "border-[#d9ded5] bg-[#fffdf6]",
    formButtonPrimary: "bg-[#286b6a] hover:bg-[#194a4d] text-white",
    formFieldInput: "border-[#cbd5ce] bg-[#fffef9] text-[#203a3d]",
    footerAction: "text-[#617476]",
    dividerLine: "bg-[#d9ded5]",
    alert: "border-[#d9a196]",
    otpCodeFieldInput: "border-[#cbd5ce] bg-[#fffef9] text-[#203a3d]",
    formFieldRow: "gap-2",
    main: "gap-4",
  },
};

export function CentinelaAuthShell({ mode, children }: { mode: "sign-in" | "sign-up"; children: ReactNode }) {
  const isSignIn = mode === "sign-in";
  return <main className="centinela cv-auth">
    <section className="cv-auth-story">
      <Link href="/" className="cv-brand" data-testid="link-auth-centinela-home"><span className="cv-mark" aria-hidden="true">C</span><span className="cv-brand-name">Centinela Ocean View</span><span className="cv-pilot-badge">Pilot</span></Link>
       <div><div className="cv-eyebrow" style={{ color: "#e5b965" }}>A home in Mar Vista</div><h1>{isSignIn ? "Come back to your community." : "There’s room at the table."}</h1><p>{isSignIn ? "Catch up on community notes, neighborhood ideas, and the small things that help us look out for one another." : "Create your account with an email approved for Centinela Ocean View resident access."}</p></div>
      <span className="cv-visually-muted" style={{ color: "#d8e4dc" }}>Centinela Ocean View · Resident community</span>
    </section>
    <section className="cv-auth-form"><div className="cv-auth-form-inner">
      <div className="cv-eyebrow">{isSignIn ? "Welcome back" : "Make yourself at home"}</div>
      <h2>{isSignIn ? "Sign in to continue" : "Create your resident account"}</h2>
      <p>{isSignIn ? "Your neighbors and community updates are waiting." : "An account connects you to resident-only community notes and activities."}</p>
      <div className="cv-auth-slot" data-testid={`slot-clerk-${mode}`}>{children}</div>
      <div className="cv-auth-links">{isSignIn ? <><span>New to the resident space?</span><Link href="/sign-up" data-testid="link-auth-sign-up">Create an account</Link></> : <><span>Already have an account?</span><Link href="/sign-in" data-testid="link-auth-sign-in">Sign in</Link></>}</div>
      <p className="cv-visually-muted">Resident access is for Centinela Ocean View neighbors.</p>
    </div></section>
  </main>;
}

export function CentinelaSignIn({ children }: { children: ReactNode }) {
  return <CentinelaAuthShell mode="sign-in">{children}</CentinelaAuthShell>;
}
export function CentinelaSignUp({ children }: { children: ReactNode }) {
  return <CentinelaAuthShell mode="sign-up">{children}</CentinelaAuthShell>;
}
