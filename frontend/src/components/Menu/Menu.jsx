import { useEffect, useId, useRef, useState } from "react";
import "./Menu.css";

export default function Menu({ items = [], currentDestination }) {
  const [openId, setOpenId] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const mobileMenuButtonRef = useRef(null);
  const triggerRefs = useRef({});
  const menuPrefix = useId();
  const mainMenuId = `${menuPrefix}-main`;
  const submenuPrefix = `${menuPrefix}-submenu`;
  const activeModuleId = currentDestination?.moduleId ?? currentDestination?.id;
  const activeRouteId = currentDestination?.routeId ?? currentDestination?.id;

  useEffect(() => {
    if (openId === null && !mobileMenuOpen) return;

    function closeOutside(event) {
      if (!menuRef.current?.contains(event.target)) {
        setOpenId(null);
        setMobileMenuOpen(false);
      }
    }

    function closeOnNavigation() {
      setOpenId(null);
      setMobileMenuOpen(false);
    }

    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("focusin", closeOutside);
    window.addEventListener("hashchange", closeOnNavigation);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("focusin", closeOutside);
      window.removeEventListener("hashchange", closeOnNavigation);
    };
  }, [openId, mobileMenuOpen]);

  function closeSubmenuAndRestoreFocus() {
    if (openId === null) return;
    triggerRefs.current[openId]?.focus();
    setOpenId(null);
  }

  function closeNavigation() {
    setOpenId(null);
    setMobileMenuOpen(false);
  }

  function handleKeyDown(event) {
    if (event.key !== "Escape") return;

    if (openId !== null) {
      event.preventDefault();
      event.stopPropagation();
      closeSubmenuAndRestoreFocus();
      return;
    }

    if (mobileMenuOpen) {
      event.preventDefault();
      event.stopPropagation();
      setMobileMenuOpen(false);
      mobileMenuButtonRef.current?.focus();
    }
  }

  return (
    <nav
      ref={menuRef}
      className={`menu${mobileMenuOpen ? " menu--open" : ""}`}
      aria-label="Navegação principal"
      onKeyDown={handleKeyDown}
    >
      <button
        ref={mobileMenuButtonRef}
        type="button"
        className="menu__toggle"
        aria-expanded={mobileMenuOpen}
        aria-controls={mainMenuId}
        aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
        onClick={() => {
          setOpenId(null);
          setMobileMenuOpen((current) => !current);
        }}
      >
        <span className="menu__toggle-icon" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>

      <ul id={mainMenuId} className="menu__list">
        {items.map((item) => (
          <li className="menu__item" key={item.id}>
            {item.children?.length ? (
              <>
                <button
                  ref={(node) => { triggerRefs.current[item.id] = node; }}
                  type="button"
                  className={`menu__link${item.id === activeModuleId ? " menu__link--active" : ""}`}
                  aria-expanded={openId === item.id}
                  aria-controls={`${submenuPrefix}-${item.id}`}
                  onClick={() => setOpenId((current) => current === item.id ? null : item.id)}
                >
                  {item.label}
                </button>
                <ul
                  id={`${submenuPrefix}-${item.id}`}
                  className="menu__submenu"
                  aria-label={item.label}
                  hidden={openId !== item.id}
                >
                  {item.children.map((child) => (
                    <li key={child.id}>
                      <a
                        className="menu__link"
                        href={child.href}
                        aria-current={child.id === activeRouteId ? "page" : undefined}
                        onClick={closeNavigation}
                      >
                        {child.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <a
                className="menu__link"
                href={item.href}
                aria-current={item.id === activeRouteId ? "page" : undefined}
                onClick={closeNavigation}
              >
                {item.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
