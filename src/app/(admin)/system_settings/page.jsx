'use client'
import { Nav, NavItem, NavLink, TabContainer, TabContent, TabPane } from 'react-bootstrap'
import { useState, useEffect } from 'react'
import GeneralSettings from './components/general_settings'
import SMSGatewaySettings from './components/sms_settings'
import EmailGatewaySettings from './components/mail_settings'
import MaintenanceSettings from './components/maintenance_settings'
import Notification from './components/notification'
import InvoiceTermsSettings from './components/invoice_term_condition'
import GitSettings from './components/git_settings'
import DomainSettings from './components/domain_settings'
import AutoDeploy from './components/AutoDeploy'
import BackupSettings from './components/BackupSettings'
import withAuthorization from '@/hoc/withAuthorization'

const TabView = () => {
  const [activeTab, setActiveTab] = useState('General Settings') // Default to 'Company'

  return (
    <TabContainer activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
      <Nav className="nav-tabs mb-3">
        {[
          { key: 'General Settings', label: 'General Settings' },
          { key: 'SMS Settings', label: 'SMS Settings' },
          { key: 'Mail Settings', label: 'Mail Settings' },
          { key: 'Notification', label: 'Notification' },
          { key: 'Invoice', label: 'Invoice & Quotation' },
          { key: 'Git Settings', label: 'Git Settings' },
          { key: 'Domain Settings', label: 'Domain Settings' },
          { key: 'Auto Deployment', label: 'Auto Deployment' },
          { key: 'Backup Settings', label: 'Backup Settings' },

        ].map(({ key, label }) => (
          <NavItem key={key}>
            <NavLink eventKey={key} className={`fw-medium ${activeTab === key ? 'active' : ''}`} onClick={() => setActiveTab(key)}>
              {label}
            </NavLink>
          </NavItem>
        ))}
      </Nav>

      <TabContent>
        <TabPane eventKey="General Settings">
          <GeneralSettings />
        </TabPane>
        <TabPane eventKey="SMS Settings">
          <SMSGatewaySettings />
        </TabPane>
        <TabPane eventKey="Mail Settings">
          <EmailGatewaySettings />
        </TabPane>
        <TabPane eventKey="Notification">
          <Notification />
        </TabPane>
        <TabPane eventKey="Invoice">
          <InvoiceTermsSettings />
        </TabPane>
        <TabPane eventKey="Git Settings">
          <GitSettings />
        </TabPane>
        <TabPane eventKey="Domain Settings">
          <DomainSettings />
        </TabPane>
        <TabPane eventKey="Auto Deployment">
          <AutoDeploy />
        </TabPane>
         <TabPane eventKey="Backup Settings">
          <BackupSettings />
        </TabPane>
      </TabContent>
    </TabContainer>
  )
}

// export default TabView
export default withAuthorization(TabView);
