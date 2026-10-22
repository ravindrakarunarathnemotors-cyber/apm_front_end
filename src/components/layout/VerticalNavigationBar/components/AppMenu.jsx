'use client'

import clsx from 'clsx'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Fragment, useCallback, useEffect, useState } from 'react'
import { Badge, Collapse } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { findAllParent, getMenuItemFromURL } from '@/helpers/menu'
import { useLayoutContext } from '@/context/useLayoutContext'

const HIDDEN_ACTION_IDS = [
  186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 
  200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 
  214, 215, 216, 219, 220, 218, 221,
]

// MenuItemWithChildren
const MenuItemWithChildren = ({ item, className, subMenuClassName, activeMenuItems, isCollapsed }) => {
  const [open, setOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const pathname = usePathname()

  const visibleChildren = item.children?.filter((child) => !HIDDEN_ACTION_IDS.includes(child.menu_id)) || []

  useEffect(() => {
    const isActive = activeMenuItems.includes(item.menu_id) || activeMenuItems.includes(item.id)
    const hasActiveChild = item.children?.some((child) => pathname.startsWith(child.route))
    setOpen(isActive || hasActiveChild)
  }, [activeMenuItems, item, pathname])

  const toggleMenuItem = (e) => {
    e.preventDefault()
    setOpen((prev) => !prev)
  }

  const isParentActive = activeMenuItems.includes(item.menu_id) || item.children?.some((child) => pathname.startsWith(child.route))

  const containerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: isCollapsed ? 'center' : 'space-between',
    padding: isCollapsed ? '12px 0' : '12px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    marginBottom: '5px',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: isHovered && !isCollapsed ? 'translateX(3px)' : 'none',
    background: isParentActive
      ? 'rgba(255, 255, 255, 0.05)'
      : isHovered
      ? 'rgba(255, 255, 255, 0.06)'
      : 'transparent',
    borderLeft: isParentActive ? '4px solid #c52222' : '4px solid transparent',
  }

  const iconStyle = {
    color: isParentActive || isHovered ? '#c52222' : 'rgba(255, 255, 255, 0.75)',
    transition: 'all 0.25s ease',
    transform: isHovered ? 'scale(1.1)' : 'scale(1)',
    fontSize: '22px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '24px',
  }

  const arrowStyle = {
    color: isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
    transition: 'transform 0.25s ease',
    transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
    fontSize: '16px',
  }

  return (
    <li className={className} style={{ listStyle: 'none' }} title={isCollapsed ? item.name : ''}>
      <div
        onClick={toggleMenuItem}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={containerStyle}
        role="button">
        <div style={{ display: 'flex', alignItems: 'center', gap: isCollapsed ? '0' : '14px', width: isCollapsed ? 'auto' : '100%', overflow: 'hidden' }}>
          {item.icon && (
            <i style={iconStyle}>
              <IconifyIcon icon={item.icon} />
            </i>
          )}
          {!isCollapsed && (
            <span
              style={{
                fontSize: '15px',
                fontWeight: isParentActive ? 600 : 500,
                color: isParentActive || isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.85)',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                flexGrow: 1,
              }}>
              {item.name}
            </span>
          )}
        </div>
        {!isCollapsed && visibleChildren.length > 0 && (
          <IconifyIcon icon="la:angle-right" style={arrowStyle} />
        )}
      </div>

      {visibleChildren.length > 0 && !isCollapsed && (
        <Collapse in={open}>
          <div>
            <ul className={subMenuClassName} style={{ paddingLeft: '18px', margin: '3px 0 8px 0', listStyle: 'none' }}>
              {visibleChildren.map((child, idx) => (
                <Fragment key={idx}>
                  <MenuItem
                    item={child}
                    isCollapsed={isCollapsed}
                    isSubMenu
                    isActive={activeMenuItems.includes(child.menu_id) || pathname === child.route}
                  />
                </Fragment>
              ))}
            </ul>
          </div>
        </Collapse>
      )}
    </li>
  )
}

// Individual MenuItem
const MenuItem = ({ item, className, isCollapsed, isSubMenu = false, isActive = false }) => {
  const [slipCount, setSlipCount] = useState(0)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    if (item.menu_id == 96) {
      fetchBankSlipCount()
    }
  }, [item.menu_id])

  const fetchBankSlipCount = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/bank/slip-count`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.menu_id }),
      })
      const data = await response.json()
      if (response.status === 200) {
        setSlipCount(Number(data.result))
      }
    } catch (error) {
      console.error(error)
    }
  }

  const handleRead = async () => {
    if (item.menu_id == 96 && slipCount > 0) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/bank/slip-read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
        if (response.status === 200) {
          setSlipCount(0)
        }
      } catch (error) {
        console.error(error)
      }
    }
  }

  if (HIDDEN_ACTION_IDS.includes(item.menu_id)) return null

  const linkStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: isCollapsed ? 'center' : 'space-between',
    padding: isCollapsed ? '12px 0' : isSubMenu ? '9px 14px' : '12px 16px',
    borderRadius: '8px',
    textDecoration: 'none',
    marginBottom: '4px',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: isHovered && !isCollapsed ? 'translateX(3px)' : 'none',
    background: isActive
      ? 'linear-gradient(90deg, rgba(197, 34, 34, 0.22) 0%, rgba(197, 34, 34, 0.03) 100%)'
      : isHovered
      ? 'rgba(255, 255, 255, 0.06)'
      : 'transparent',
    borderLeft: isActive ? '4px solid #c52222' : '4px solid transparent',
    boxShadow: isActive ? 'inset 1px 0 12px rgba(197, 34, 34, 0.2)' : 'none',
  }

  const iconStyle = {
    color: isActive || isHovered ? '#c52222' : 'rgba(255, 255, 255, 0.75)',
    transition: 'all 0.25s ease',
    transform: isHovered ? 'scale(1.1)' : 'scale(1)',
    fontSize: isSubMenu ? '19px' : '22px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '24px',
  }

  return (
    <li className={className} style={{ listStyle: 'none' }} onClick={handleRead} title={isCollapsed ? item.name : ''}>
      <Link
        href={item.route || '#'}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={linkStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isCollapsed ? '0' : '14px', width: isCollapsed ? 'auto' : '100%', overflow: 'hidden' }}>
          {item.icon && (
            <i style={iconStyle}>
              <IconifyIcon icon={item.icon} />
            </i>
          )}
          {!isCollapsed && (
            <span
              style={{
                fontSize: isSubMenu ? '14px' : '15px',
                fontWeight: isActive ? 600 : 500,
                color: isActive || isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.85)',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
              }}>
              {item.name}
            </span>
          )}
        </div>

        {item.menu_id == 96 && slipCount > 0 && !isCollapsed && (
          <Badge
            bg="danger"
            style={{
              borderRadius: '50px',
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: '600',
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            }}>
            {slipCount}
          </Badge>
        )}
      </Link>
    </li>
  )
}

// Main AppMenu component
const AppMenu = ({ menuItems = [], mainItems = [] }) => {
  const pathname = usePathname()
  const [activeMenuItems, setActiveMenuItems] = useState([])
  const {
    menu: { size },
  } = useLayoutContext()

  const activeMenu = useCallback(() => {
    const fullMenu = [...menuItems, ...mainItems]
    const matchingMenuItem = getMenuItemFromURL(fullMenu, pathname)

    if (matchingMenuItem && matchingMenuItem.menu_id) {
      setActiveMenuItems([matchingMenuItem.menu_id, matchingMenuItem.parent_id])
    }
  }, [pathname, menuItems, mainItems])

  useEffect(() => {
    if (menuItems?.length || mainItems?.length) {
      activeMenu()
    }
  }, [activeMenu, menuItems, mainItems])

  const isCollapsed = size === 'collapsed'

  return (
    <nav style={{ padding: isCollapsed ? '12px 4px' : '12px 10px', width: '100%' }}>
      {/* Main Items */}
      {mainItems.length > 0 && (
        <ul style={{ padding: 0, margin: '0 0 18px 0', listStyle: 'none' }}>
          {mainItems.map((item) => (
            <MenuItem
              key={item.id || item.menu_id}
              item={item}
              isCollapsed={isCollapsed}
              isActive={activeMenuItems.includes(item.menu_id) || pathname === item.route}
            />
          ))}
        </ul>
      )}

      {/* Categorized Menu Items */}
      {menuItems.length > 0 &&
        menuItems.map((item) => {
          const childrenList = Array.isArray(item.children) ? item.children : []
          
          return (
            <div key={item.id || item.menu_id} style={{ marginBottom: '18px' }}>
              {!isCollapsed && item.name && item.name !== 'Other#' && item.name !== 'Other' && (
                <h6
                  style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    color: 'rgba(255, 255, 255, 0.45)',
                    padding: '0 16px',
                    margin: '14px 0 8px 0',
                    textTransform: 'uppercase',
                    letterSpacing: '1.2px',
                  }}>
                  {item.name}
                </h6>
              )}

              {childrenList.length > 0 && (
                <ul style={{ padding: 0, margin: 0, listStyle: 'none' }}>
                  {childrenList
                    .map((child, idx) => {
                      if (HIDDEN_ACTION_IDS.includes(child.menu_id)) return null

                      const hasChildren = Array.isArray(child.children) && child.children.length > 0
                      const visibleGrandChildren = hasChildren
                        ? child.children.filter((grandChild) => !HIDDEN_ACTION_IDS.includes(grandChild.menu_id))
                        : []

                      if (hasChildren && visibleGrandChildren.length === 0 && child.route === '#') {
                        return null
                      }

                      return hasChildren && visibleGrandChildren.length > 0 ? (
                        <MenuItemWithChildren
                          key={idx}
                          item={{ ...child, children: visibleGrandChildren }}
                          activeMenuItems={activeMenuItems}
                          isCollapsed={isCollapsed}
                        />
                      ) : (
                        <MenuItem
                          key={idx}
                          item={child}
                          isCollapsed={isCollapsed}
                          isActive={activeMenuItems.includes(child.menu_id) || pathname === child.route}
                        />
                      )
                    })
                    .filter(Boolean)}
                </ul>
              )}
            </div>
          )
        })}
    </nav>
  )
}

export default AppMenu