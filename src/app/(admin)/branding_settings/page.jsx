
'use client';
import { Nav, NavItem, NavLink, TabContainer, TabContent, TabPane } from 'react-bootstrap';
import { useState, useEffect } from 'react';
import CompanyDetails from './components/company_details';
import Systemimage from './components/system_images';
import BankDetails from './components/bank_details';
import SystemColors from './components/sysytem_colors';
import withAuthorization from '@/hoc/withAuthorization'



const TabView = () => {
  const [activeTab, setActiveTab] = useState("Company Details"); // Default to 'Company'

 


  return (
    <TabContainer activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
      <Nav className="nav-tabs mb-3">
        {[
          { key: "Company Details", label: "Company Details" },
          { key: "Bank Details", label: "Bank Details" },
          { key: "Images", label: "Images" },
          { key: "System Colors", label: "System Colors" },
        
          // { key: "Maintenance Settings", label: "Maintenance Settings" },
        ].map(({ key, label }) => (
          <NavItem key={key}>
            <NavLink
              eventKey={key}
              className={`fw-medium ${activeTab === key ? "active" : ""}`}
              onClick={() => setActiveTab(key)}
            >
              {label}
            </NavLink>
          </NavItem>
        ))}
      </Nav>

      <TabContent>
        <TabPane eventKey="Company Details">
          <CompanyDetails/> 
        </TabPane>
        <TabPane eventKey="Images">
          <Systemimage/>
        </TabPane>
        <TabPane eventKey="Bank Details">
          <BankDetails/>
        </TabPane>
        <TabPane eventKey="System Colors">
          <SystemColors /> 
        </TabPane>
        {/* <TabPane eventKey="Settings">
        {selectedUser ? <Settings selectedUser={selectedUser} /> : <p>Loading...</p>}
          
        </TabPane> */}
      </TabContent>
    </TabContainer>
  );
};

// export default TabView;
export default withAuthorization(TabView);
