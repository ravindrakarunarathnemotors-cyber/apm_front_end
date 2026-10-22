'use client';
import { Nav, NavItem, NavLink, TabContainer, TabContent, TabPane } from 'react-bootstrap';
import { useState, useEffect } from 'react';
import MainMenu from '@/components/MenuItems/MainMenu';
import SubMenu from '@/components/MenuItems/SubMenu';
import ChildMenu from '@/components/MenuItems/ChildMenu'
import withAuthorization from '@/hoc/withAuthorization'

const MenuItems = () => {
    const [activeTab, setActiveTab] = useState("Main Menu"); // Default to 'Company'
    return (
        <div>
            <TabContainer activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
                <Nav className="nav-tabs mb-3">
                    {[
                        { key: "Main Menu", label: "Main Menu" },
                        { key: "Sub Menu", label: "Sub Menu" },
                        { key: "Child Menu", label: "Child Menu" },

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
                    <TabPane eventKey="Main Menu">
                        <MainMenu />
                    </TabPane>
                    <TabPane eventKey="Sub Menu">
                        <SubMenu />
                    </TabPane>
                    <TabPane eventKey="Child Menu">
                        <ChildMenu />
                    </TabPane>
                </TabContent>
            </TabContainer>
        </div>
    )
}

// export default MenuItems
export default withAuthorization(MenuItems);
