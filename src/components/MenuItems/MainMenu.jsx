import React, { useEffect, useState } from 'react'
import ComponentContainerCard from '../ComponentContainerCard'
import { ReactSortable } from 'react-sortablejs';
import axios from "axios";
import { Button } from 'react-bootstrap'
import Swal from 'sweetalert2'

const MainMenu = () => {
    const [items, setItems] = useState([]);

    useEffect(() => {
        getData()
    }, [])


    // SortableJS wants a list prop it can mutate; we keep order clean (1..n)
    const handleSetList = (next) => {
        console.log(next)
        const withOrder = next.map((it, idx) => ({ ...it, order: idx + 1 }));
        setItems(withOrder);

        // optionally persist:
        // fetch('/api/menu/reorder', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(withOrder) });
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
            const { data } = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}/api/main_menu`);
            setItems(data.result)
        } catch (err) {
            // Optional: surface a readable error
            console.error(err?.response?.data?.message || err.message);
        }
    }

    const sendData = async () => {
        try {
            const data  = await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}/api/save_main_menu`, { menus: items });
            if(data.status === 200){
                getData()
                Swal.fire({ title: "Success!", text: "Menu saved successfully", icon: "success", confirmButtonText: "OK" });
            }
            
        } catch (err) {
            // Optional: surface a readable error
            console.error(err?.response?.data?.message || err.message);
        }
    }
    

    return (
        <div>
            <ComponentContainerCard title="Main Menu">
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
            </ComponentContainerCard>
        </div>
    )
}

export default MainMenu