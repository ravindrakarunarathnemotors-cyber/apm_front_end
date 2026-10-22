'use client';

import React, { useEffect, useState } from 'react';
import ContainerCardOnly from '@/components/ContainerCardOnly';
import { Table, Pagination, Button, Form, Spinner, FormLabel, FormGroup } from 'react-bootstrap';
import { useRefreshTokenMutation, useGetsystemLogsMutation } from '@/store/features/apiSlice';
import RedCard from '@/components/Redcard';
import withAuthorization from "@/hoc/withAuthorization";
import { useForm } from "react-hook-form";
import { sameTimeFormate } from '@/utils/date';
//import { debounce } from "lodash";
// import withAuthorization from '@/hoc/withAuthorization'


const UserLog = () => {
    const [logs, setLogs] = useState([]);
    const { watch, setValue } = useForm();
    
    const [currentPage, setCurrentPage] = useState(1);
    const logsPerPage = 25;
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(false);
    const [refreshtoken] = useRefreshTokenMutation();
    const client_id = typeof window !== "undefined" ? sessionStorage.getItem("client_id") : null;
    const [fetchUserLogs, { isLoading, data, error }] = useGetsystemLogsMutation();
   
    const [fromDate, setFromDate] = useState("");
    const [adminid, setAdminid] = useState("");
    const [keyword, setKeyword] = useState("");

   

    useEffect(() => {
        fetchUserLogs();
    }, [fetchUserLogs]);

    useEffect(() => {
        if (client_id) fetchLogs(1);
    }, [client_id]);

    useEffect(() => {
        fetchLogs(1);
    }, []);

    const logoutUser = () => {
        sessionStorage.clear();
        localStorage.clear();
        window.location.href = "/auth/login";
    };

    const fetchLogs = async (page) => {
        console.log("Fetching logs...");
        try {
            setLoading(true);
            const skip = (page - 1) * logsPerPage;
            const response = await fetchUserLogs({
                // client_id, 
                page,
                skip,
                limit: logsPerPage,
                date: fromDate,
                sys_id: adminid,
                log :keyword,
              

            }).unwrap();
            console.log('Fetched logs from mutation:', response);
            setLogs(response.logs);
            setTotalPages(response.totalPages);
            setCurrentPage(page);
        } catch (error) {
            console.error("Error fetching user logs:", error);
            if (error?.status === 403 && error?.data?.message === "Access token expired") {
                const refreshToken = localStorage.getItem("refresh_token");
                if (refreshToken) {
                    try {
                        const responset = await refreshtoken(refreshToken).unwrap();
                        sessionStorage.setItem("access_token", responset.access_token);
                        const skip = (page - 1) * logsPerPage;
                        const response = await fetchUserLogs({

                            page, skip,
                            limit: logsPerPage,
                            date: fromDate,
                            sys_id: adminid,
                            log: keyword,
                         


                        }).unwrap();

                        setLogs(response.logs);
                        setTotalPages(response.totalPages);
                        setCurrentPage(page);
                    } catch (refreshError) {
                        console.error("Error refreshing token:", refreshError);
                        logoutUser();
                    }
                } else {
                    console.log("No refresh token found");
                }
            }
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (pageNumber) => {
        if (pageNumber < 1 || pageNumber > totalPages) return;
        setCurrentPage(pageNumber);
        fetchLogs(pageNumber);
    };


    const getPaginationRange = () => {
        const maxVisiblePages = 7;
        let startPage = Math.max(currentPage - Math.floor(maxVisiblePages / 2), 1);
        let endPage = Math.min(startPage + maxVisiblePages - 1, totalPages);
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(endPage - maxVisiblePages + 1, 1);
        }
        return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
    };

    return (
            <ContainerCardOnly>
            <div className="d-flex justify-content-between mb-3">
              <h4>System Logs</h4>
              <div className="d-flex align-items-center" style={{ gap: '10px' }}>
                <Form.Control
                  type="text"
                  placeholder="System ID"
                  value={adminid}
                  onChange={(e) =>  setAdminid(e.target.value)}
                  style={{ maxWidth: '120px' }}
                />

                <Form.Control
                  type="text"
                  placeholder="Key Words"
                  value={keyword}
                  onChange={(e) =>  setKeyword(e.target.value)}
                  style={{ maxWidth: '120px' }}
                />
                
                <Form.Control
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  style={{ maxWidth: '150px' }}
                />


                       <Button variant="primary" style={{ paddingLeft: '2.95rem', paddingRight: '2.95rem', marginRight: '20px' }} onClick={() => fetchLogs(1)}>
                            Search
                        </Button>
                    
              </div>
            </div>
                {loading || isLoading ? (
                    <div className="d-flex justify-content-center my-4">
                        <Spinner animation="border" variant="primary" />
                    </div>
                ) : (
                    <>
                        {(logs && logs.length > 0) ? (
                            <Table striped bordered hover style={{ marginTop: '20px' }}>
                                <thead className="table-light">
                                    <tr>
                                        <th>ID</th>
                                        <th>Comment</th>
                                        <th>Module</th>
                                        <th>Date</th>
                                        
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map(log => (

                                        <tr key={log.id}>
                                            <td>{log.id}</td>
                                            <td>{log.comment}</td>
                                            <td>{log. module}</td>
                                            <td>{sameTimeFormate(log.datetime)}</td>
                                            

                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        ) : (
                            <RedCard />
                        )}
                        {logs.length > 0 && (
                            <div className="d-flex justify-content-end">
                                <Pagination>
                                    <Pagination.Prev
                                        disabled={currentPage === 1}
                                        onClick={() => handlePageChange(currentPage - 1)}
                                    />
                                    {getPaginationRange().map((pageNum) => (
                                        <Pagination.Item
                                            key={pageNum}
                                            active={pageNum === currentPage}
                                            onClick={() => handlePageChange(pageNum)}
                                        >
                                            {pageNum}
                                        </Pagination.Item>
                                    ))}

                                    <Pagination.Next
                                        disabled={currentPage === totalPages}
                                        onClick={() => handlePageChange(currentPage + 1)}
                                    />
                                </Pagination>
                            </div>
                        )}
                    </>
                )}
            </ContainerCardOnly>
       
    );
};

// export default UserLog;
export default withAuthorization(UserLog);

