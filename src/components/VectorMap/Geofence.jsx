import React, { useEffect, useState } from 'react'
import { Modal, ModalBody, ModalHeader, FormControl, FormLabel, } from 'react-bootstrap';
import { useRefreshTokenMutation } from '@/store/features/apiSlice';
import Swal from "sweetalert2";
import useLogout from '@/hooks/useLogout'
import Select from 'react-select';


const Geofence = ({ polygonPath, open, setOpen }) => {
    const [allRoute, setAllRoute] = useState([])
    const [selectRoute, setSelectRoute] = useState(null)
    const [startGeo, setStartGeo] = useState('')

    useEffect(() => {
        fetchRoute()
    }, [])

    useEffect(() => {
        if (selectRoute) {
            fetchGeocode()
        }
    }, [selectRoute])

    const [refreshtoken] = useRefreshTokenMutation()
    const { Logout } = useLogout()

    let token = ''
    if (typeof window !== "undefined") {
        token = sessionStorage.getItem("access_token");

    }

    const fetchGeocode = async () => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/riderpath/start_geo`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    selectRoute: selectRoute
                })

            })

            const data = await response.json();
            if (response.status === 200) {
                setStartGeo(data.start)
            }
        } catch (error) {
            console.error(error)
        }
    }

    const hanldeClose = () => {
        setOpen(false)
    }

    const fetchRoute = async () => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/rider/allRoute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({}),
            })

            if (response.status === 403 || response.status === 401) {
                const refreshToken = localStorage.getItem('refresh_token')
                if (refreshToken) {
                    try {
                        const response = await refreshtoken(refreshToken).unwrap()
                        sessionStorage.setItem('access_token', response.access_token)
                        token = response.access_token
                        return fetchRoute()
                    } catch (refreshError) {
                        console.error('Error refreshing token:', refreshError)
                        Logout()
                    }
                } else {
                    console.log('No refresh token found')
                }
            }

            const data = await response.json()
            if (response.status === 200) {
                setAllRoute(data.result)
            }
        } catch (error) {
            console.error(error)
        }
    }

    const handleSubmit = async () => {
        if (!selectRoute || !startGeo || polygonPath.length < 1) {
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'Please enter all the fields!',
            })
            return
        }

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/riderpath/add-geofence`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    polygonPath: polygonPath,
                    startGeo: startGeo,
                    selectRoute: selectRoute
                })

            })

            const data = await response.json();
            if (response.status === 200) {
                setOpen(false)
                Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: 'Geofence added successfully',
                })
            }
        } catch (error) {
            console.error(error)
        }
    }

    return (
        <div>
            <Modal show={open} onHide={hanldeClose} centered className="fade" id="exampleModalCenter" tabIndex={-1} role="dialog">
                <ModalHeader closeButton className='bg-light'>
                    <h6 className="modal-title m-0 text-black" id="exampleModalCenterTitle">
                        Add Geofence
                    </h6>
                </ModalHeader>
                <ModalBody>
                    <div className='mb-2'>
                        <Select
                            placeholder="Select Route"
                            options={allRoute}
                            value={allRoute.find((option) => option.value === selectRoute) || null}
                            onChange={(selectedOption) => setSelectRoute(selectedOption?.value || null)}
                            isClearable
                            className="w-100"
                        />
                    </div>

                    <FormLabel>Start Geo Location</FormLabel>
                    <FormControl type="text" autoComplete="off" onChange={e => setStartGeo(e.target.value)} value={startGeo} disabled={!selectRoute} />

                    <div className='text-end'>
                        <button className='btn btn-primary mt-2 ' onClick={handleSubmit}>Submit</button>
                    </div>

                </ModalBody>

            </Modal>
        </div>
    )
}

export default Geofence