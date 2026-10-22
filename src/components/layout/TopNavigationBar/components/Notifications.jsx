'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem, Badge, Spinner } from 'react-bootstrap'
import SimplebarReactClient from '@/components/wrappers/SimplebarReactClient'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { useRouter } from 'next/navigation'
import { io } from 'socket.io-client'
import { useGetAdminNotificationsQuery, useGetAdminUnreadCountQuery, useMarkNotificationsReadMutation } from '@/store/features/apiSlice'
import ReactDOM from 'react-dom'

const moduleIcons = {
  'Order Management': 'mdi:package-variant-closed',
  'Inventory Management': 'mdi:warehouse',
  'Support Ticket': 'mdi:ticket-confirmation',
  'Invoice Management': 'mdi:file-document-outline',
  'Product & Catalog Updates': 'mdi:shopping',
  'User & Client Management': 'mdi:account-group',
}

const moduleRoutes = {
  'Support Ticket': '/technical_ticket',
  'Invoice Management': '/all_invoice',
  'Order Management': '/all_orders',
  'Inventory Management': '/stock_in_out',
  'Product Management': '/products',
   'System Deployment': '/active_services',
   'System Update': '/active_services',
}

const Notifications = () => {
  const [page, setPage] = useState(1)
  const [allNotifications, setAllNotifications] = useState({})
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [hoveredId, setHoveredId] = useState(null)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [now, setNow] = useState(new Date())
  const [isMuted, setIsMuted] = useState(false)
  
  const audioRef = useRef(null)
  const router = useRouter()

  const { data, isLoading, isFetching, refetch } = useGetAdminNotificationsQuery({ page, limit: 10 })
  const { data: unreadData, refetch: refetchUnread } = useGetAdminUnreadCountQuery(null)
  const [markAsReadMutation] = useMarkNotificationsReadMutation()
  
  const unreadCount = unreadData?.unreadCount ?? 0

  useEffect(() => {
    audioRef.current = new Audio('/sound/success.mp3')
    const savedMute = localStorage.getItem('notif_muted')
    if (savedMute === 'true') setIsMuted(true)
  }, [])

  const toggleMute = (e) => {
    e.stopPropagation()
    const newMuteState = !isMuted
    setIsMuted(newMuteState)
    localStorage.setItem('notif_muted', newMuteState.toString())
  }

  const formatTimeAgo = (dateString) => {
    if (!dateString) return '';
    const cleanDateString = dateString.endsWith('Z') ? dateString.replace('Z', '') : dateString;
    const past = new Date(cleanDateString).getTime();
    const nowMs = now.getTime();
    const diffInSeconds = Math.floor((nowMs - past) / 1000);

    if (diffInSeconds < 30 && diffInSeconds > -30) return 'Just now';
    const absSeconds = Math.abs(diffInSeconds);
    const minutes = Math.floor(absSeconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24); // Fix: declared days

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${absSeconds}s ago`;
  };

  useEffect(() => {
    const timer = setInterval(() => { setNow(new Date()); }, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_BASE_URL;
    const adminId = "1"; 

    const socket = io(socketUrl, {
      query: { userId: adminId },
      transports: ['websocket', 'polling'],
    });

    socket.on('new_admin_notification', (notif) => {
      if (audioRef.current && !isMuted) {
        audioRef.current.play().catch(() => {});
      }

      setAllNotifications((prev) => {
        const moduleName = notif.module || "General";
        const existing = prev[moduleName] || [];
        if (existing.find(n => n.notification_id === notif.notification_id)) return prev;
        return {
          ...prev,
          [moduleName]: [notif, ...existing]
        };
      });
      refetchUnread();
    });

    return () => socket.disconnect();
  }, [refetchUnread, isMuted]);

  useEffect(() => {
    if (data && !isFetching) {
      setAllNotifications((prev) => {
        const merged = { ...prev }
        for (const moduleName in data.data) {
          const incoming = data.data[moduleName] || []
          const existing = prev[moduleName] || []
          const existingIds = new Set(existing.map((n) => n.notification_id))
          const newOnes = incoming.filter((n) => !existingIds.has(n.notification_id))
          merged[moduleName] = [...existing, ...newOnes]
        }
        return merged
      })
    }
  }, [data, isFetching])

const markNotificationClickAsRead = async (notif) => {
    if (notif.status === 'Unread') {
      try {
        await markAsReadMutation({ notification_ids: [Number(notif.notification_id)], is_viewed: true })
        refetchUnread()
      } catch (err) { console.error(err) }
    }

    let redirectPath = '/';
    
    // 1. මුලින්ම මොඩියුලය moduleRoutes එකේ තියෙනවද බලන්න
    if (moduleRoutes[notif.module]) {
      redirectPath = moduleRoutes[notif.module];
    } else {
      // 2. මොඩියුලය නැත්නම් විතරක් මැසේජ් එකේ තියෙන වචන අනුව රූට් එක තීරණය කරන්න
      const msg = notif.message_template ? notif.message_template.toLowerCase() : '';
      if (msg.includes('technical')) redirectPath = '/technical_ticket';
      else if (msg.includes('billing')) redirectPath = '/billing_ticket';
      else if (msg.includes('sales')) redirectPath = '/sales_ticket';
      else redirectPath = '/';
    }

    setIsRedirecting(true)
    setTimeout(() => {
      router.push(redirectPath)
      setIsRedirecting(false)
    }, 600)
  }

  // Unified List Logic: Flatten the object into a single array and sort by date
  const flattenedNotifications = Object.values(allNotifications)
    .flat()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <Dropdown show={dropdownOpen} onToggle={(isOpen) => setDropdownOpen(isOpen)} className="topbar-item">
      <DropdownToggle as="a" className="nav-link arrow-none nav-icon position-relative">
        <i className="icofont-bell-alt" />
        {unreadCount > 0 && <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">{unreadCount}</span>}
      </DropdownToggle>

      <DropdownMenu className="dropdown-menu-end dropdown-lg py-0 shadow-lg" style={{ minWidth: 360 }}>
        <div className="px-3 pt-3 pb-2">
          <h5 className="m-0 d-flex justify-content-between align-items-center">
            Notifications
            <div className="d-flex align-items-center">
              <button onClick={toggleMute} className="btn btn-sm btn-link p-0 me-3 text-secondary">
                <IconifyIcon icon={isMuted ? "mdi:volume-off" : "mdi:volume-high"} className="fs-4" />
              </button>
              {unreadCount > 0 && <Badge bg="primary" pill>{unreadCount}</Badge>}
            </div>
          </h5>
          <hr className="mt-2 mb-0" />
        </div>

        <SimplebarReactClient style={{ maxHeight: 420 }}>
          {flattenedNotifications.length === 0 && !isLoading && (
             <div className="text-center py-3 text-muted">No notifications found</div>
          )}
          
          {flattenedNotifications.map((notif) => {
            const isHovered = hoveredId === notif.notification_id
            const isUnread = notif.status === 'Unread'
            
            return (
              <DropdownItem 
                key={notif.notification_id}
                onClick={() => markNotificationClickAsRead(notif)}
                onMouseEnter={() => setHoveredId(notif.notification_id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`py-2 border-bottom-dashed ${isUnread ? 'notification-unread' : ''}`}
              >
                <div className="d-flex justify-content-between">
                  <small className="text-muted">{formatTimeAgo(notif.created_at)}</small>
                  {isUnread && <Badge bg="primary" pill style={{ fontSize: '10px' }}>New</Badge>}
                </div>
                <div className="d-flex align-items-center mt-1">
                  <div className="flex-shrink-0">
                     <IconifyIcon 
                        icon={moduleIcons[notif.module] || 'mdi:bell'} 
                        className="fs-4 me-2" 
                        style={{ color: isHovered ? '#28a745' : '#555' }}
                     />
                  </div>
                  <div className="flex-grow-1 text-truncate">
                    <h6 className="my-0 fs-13">{notif.event_type}</h6>
                    <small className="text-muted d-block text-truncate" style={{ maxWidth: '250px' }}>
                       {notif.message_template}
                    </small>
                  </div>
                </div>
              </DropdownItem>
            )
          })}
        </SimplebarReactClient>
      </DropdownMenu>

      {isRedirecting && ReactDOM.createPortal(
          <div className="redirect-overlay">
            <Spinner animation="border" variant="primary" />
            <h6 className="mt-2 text-white">Redirecting...</h6>
          </div>,
          document.body
      )}

      <style jsx>{`
        .notification-unread { background-color: #f0f7ff; }
        .border-bottom-dashed { border-bottom: 1px dashed #eef2f7; }
        .redirect-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.5);
          z-index: 9999; display: flex; flex-direction: column;
          align-items: center; justify-content: center; backdrop-filter: blur(2px);
        }
      `}</style>
    </Dropdown>
  )
}

export default Notifications