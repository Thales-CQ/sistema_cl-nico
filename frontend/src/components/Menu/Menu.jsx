import { useEffect, useId, useRef, useState } from "react";
import "./Menu.css";

export default function Menu({ items = [], currentDestination }) {
  const [openIds, setOpenIds] = useState([]);
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
    if (openIds.length === 0 && !mobileMenuOpen) return;

    function closeOutside(event) {
      if (!menuRef.current?.contains(event.target)) {
        setOpenIds([]);
        setMobileMenuOpen(false);
      }
    }

    function closeOnNavigation() {
      setOpenIds([]);
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
  }, [openIds, mobileMenuOpen]);

  function closeSubmenuAndRestoreFocus() {
    const currentId = openIds.at(-1);
    if (currentId === undefined) return;
    triggerRefs.current[currentId]?.focus();
    setOpenIds((current) => current.slice(0, -1));
  }

  function closeNavigation() {
    setOpenIds([]);
    setMobileMenuOpen(false);
  }

  function handleKeyDown(event) {
    if (event.key !== "Escape") return;

    if (openIds.length > 0) {
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
          setOpenIds([]);
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
        {renderItems(items, submenuPrefix)}
      </ul>
    </nav>
  );

  function renderItems(menuItems, idPrefix) {
    return menuItems.map((item) => (
          <li className="menu__item" key={item.id}>
            {item.children?.length ? (
              <>
                <button
                  ref={(node) => { triggerRefs.current[item.id] = node; }}
                  type="button"
                  className={`menu__link${item.id === activeModuleId || item.pageId === currentDestination?.id ? " menu__link--active" : ""}`}
                  aria-expanded={openIds.includes(item.id)}
                  aria-haspopup="true"
                  aria-controls={`${idPrefix}-${item.id}`}
                  onClick={() => setOpenIds((current) => current.includes(item.id)
                    ? current.filter((id) => id !== item.id)
                    : [...current, item.id])}
                >
                  {item.label}
                </button>
                <ul
                  id={`${idPrefix}-${item.id}`}
                  className="menu__submenu"
                  aria-label={item.label}
                  hidden={!openIds.includes(item.id)}
                >
                  {renderItems(item.children, `${idPrefix}-${item.id}`)}
                </ul>
              </>
            ) : item.disabled ? (
              <button
                type="button"
                className="menu__link menu__link--disabled"
                aria-disabled="true"
                disabled
              >
                {item.label}
              </button>
            ) : (
              <a
                className="menu__link"
                href={item.href}
                aria-current={(item.routeId ?? item.id) === activeRouteId || item.id === activeRouteId ? "page" : undefined}
                onClick={closeNavigation}
              >
                {item.label}
              </a>
            )}
          </li>
        ));
  }
}
