import "./AuthLayout.css";
import BrandMark from "../../components/BrandMark/BrandMark";

export default function AuthLayout({ children, variant }) {
  const isLogin = variant === "login";

  return (
    <main className={`auth-layout${isLogin ? " auth-layout--login" : ""}`}>
      <section
        className={`auth-layout__panel${isLogin ? " auth-layout__panel--login" : ""}`}
        aria-labelledby="auth-layout-title"
      >
        {isLogin ? (
          <div className="auth-layout__identity">
            <div className="auth-layout__brand-lockup">
              <span className="auth-layout__brand-mark"><BrandMark /></span>
              <h1 id="auth-layout-title" className="auth-layout__title">TCQ Clinic</h1>
            </div>
          </div>
        ) : (
          <h1 id="auth-layout-title" className="auth-layout__title">TCQ Clinic</h1>
        )}
        {isLogin ? <div className="auth-layout__content">{children}</div> : children}
      </section>
    </main>
  );
}
