import React, { useEffect, useState } from 'react'
import ComponentContainerCard from '../ComponentContainerCard'
import { ReactSortable } from 'react-sortablejs';
import axios from "axios";
import { Button } from 'react-bootstrap'
import Swal from 'sweetalert2'
import Select from 'react-select'

const ChildMenu = () => {
    const [items, setItems] = useState([]);
    const [menus, setMenus] = useState([])
    const [subMenu, setSubMenu] = useState([])
    const [subLoading, setSubLoading] = useState(false)
    const [selectSub, setSelectSub] = useState(null)
    const [loading, setLoading] = useState(false)
    const [selectMenu, setSelectMenu] = useState(null)

    useEffect(() => {
        getData()
    }, [])


    // SortableJS wants a list prop it can mutate; we keep order clean (1..n)
    const handleSetList = (next) => {
        const withOrder = next.map((it, idx) => ({ ...it, order: idx + 1 }));
        setItems(withOrder);
    };

    const itemStyle = {
        padding: '12px',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        marginBottom: 8,
        background: '#fff',
        cursor: 'grab',
    };


    const getData = async () => {
        try {
            const { data } = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}/api/main_menu_dropdown`);
            setMenus(data.result)
        } catch (err) {
            // Optional: surface a readable error
            console.error(err?.response?.data?.message || err.message);
        }
    }

    const sendData = async () => {
        try {
            const data = await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}/api/save_main_menu`, { menus: items });
            if (data.status === 200) {
                setLoading(false)
                Swal.fire({ title: "Success!", text: "Menu saved successfully", icon: "success", confirmButtonText: "OK" });
            }

        } catch (err) {
            // Optional: surface a readable error
            console.error(err?.response?.data?.message || err.message);
        }
    }

    const getSubMenu = async () => {
        setLoading(true)
        try {
            const { data } = await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}/api/child_menu_sub`,
                {
                    menu_id: selectMenu
                }
            );
            setSubMenu(data.result)
            setLoading(false)
        } catch (err) {
            // Optional: surface a readable error
            console.error(err?.response?.data?.message || err.message);
            setLoading(false)
        }
    }

    const checkRider = () => {
        if (selectMenu) {
            getSubMenu()
        } else {

        }
    }

    const handlesubMenu = () => {
        if (selectSub) {
            getChildMenu()
        } else {

        }
    }

    const getChildMenu = async () => {
        setLoading(true)
        try {
            const { data } = await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}/api/child_menu`,
                {
                    menu_id: selectSub
                }
            );
            setItems(data.result)
            setLoading(false)
        } catch (err) {
            // Optional: surface a readable error
            console.error(err?.response?.data?.message || err.message);
            setLoading(false)
        }
    }

    console.log(items)


    return (
        <div>
            <ComponentContainerCard title="Child Menu">
                <div className="d-flex gap-1 flex-wrap d-print-none mb-2">
                    <div style={{ maxWidth: '400px', flex: '1 1 auto' }}>
                        <Select
                            placeholder="Select Menu"
                            options={menus}
                            value={menus.find((option) => option.value === selectMenu) || null}
                            onChange={(selectedOption) => {
                                setSelectMenu(selectedOption?.value || null)
                            }}
                            isClearable
                            className="w-100"
                        />
                    </div>
                    <Button variant="info" className="d-flex align-items-center justify-content-center gap-1" style={{ flexShrink: 0 }} onClick={checkRider}>

                        <span>Go</span>
                    </Button>
                </div>

                {subMenu.length > 0 && (
                    <div className="d-flex gap-1 flex-wrap d-print-none mb-2">
                        <div style={{ maxWidth: '400px', flex: '1 1 auto' }}>
                            <Select
                                placeholder="Select Sub menu"
                                options={subMenu}
                                value={subMenu.find((option) => option.value === selectSub) || null}
                                onChange={(selectedOption) => {
                                    setSelectSub(selectedOption?.value || null)
                                }}
                                isClearable
                                className="w-100"
                            />
                        </div>
                        <Button variant="info" className="d-flex align-items-center justify-content-center gap-1" style={{ flexShrink: 0 }} onClick={handlesubMenu}>

                            <span>Go</span>
                        </Button>
                    </div>
                )}

                {loading && (
                    <div className="text-center">
                        <div className="spinner-border" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                )}

                {items.length > 0 && (
                    <>
                        <ReactSortable list={items} setList={handleSetList} animation={150}>
                            {items.map((it) => (
                                <div key={it.id} style={itemStyle}>
                                    {it.name} <small style={{ opacity: .6 }}> (order {it.order_index})</small>
                                </div>
                            ))}
                        </ReactSortable>

                        <div className='text-end'>
                            <Button variant="primary" onClick={() => sendData()}>
                                {/* <Icon icon="material-symbols:search-rounded" width="20" height="20" /> */}
                                <span>Save</span>
                            </Button>
                        </div>
                    </>
                )}
            </ComponentContainerCard>
        </div>
    )
}

export default ChildMenu