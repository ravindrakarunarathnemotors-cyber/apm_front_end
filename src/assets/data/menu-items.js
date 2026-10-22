export const MENU_ITEMS = [{
  key: 'main',
  label: 'Main Menu',
  isTitle: true
}, {
  key: 'dashboards',
  icon: 'iconoir:home-simple',
  label: 'Dashboards',
  children: [{
    key: 'dashboard-analytics',
    label: 'Analytics',
    url: '/dashboard/analytics',
    parentKey: 'dashboards'
  }, {
    key: 'dashboard-ecommerce',
    label: 'Ecommerce',
    url: '/dashboard/ecommerce',
    parentKey: 'dashboards'
  }]
}

,
 {
  key: 'components',
  label: 'SETTINGS',
  isTitle: true
}, {
  key: 'base-ui',
  icon: 'iconoir:compact-disc',
  label: 'User Management',
  children: [{
    key: 'base-ui-alerts',
    label: 'Add User',
    url: '/add_user',
    parentKey: 'base-ui'
  }, {
    key: 'base-ui-avatars',
    label: 'Add Role',
    url: '/add_role',
    parentKey: 'base-ui'
  }, {
    key: 'base-ui-buttons',
    label: 'User List',
    url: '/user_list',
    parentKey: 'base-ui'
  }, {
    key: 'base-ui-badges',
    label: 'Role List',
    url: '/role_list',
    parentKey: 'base-ui'
  }]
}


];