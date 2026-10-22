'use client';


import React, { useEffect, useState } from 'react';
import ComponentContainerCard from '@/components/ComponentContainerCard';
import { useAddColorMutation, useAddSizeMutation, useGetcolorsLogsMutation, useGetsizesLogsMutation, useEditStatesizeMutation, useEditStatecolorMutation,useEditStatesizenameMutation, useEditStatecolornameMutation } from '@/store/features/apiSlice';
import { Table, Pagination, Button, Form, Spinner, FormGroup, FormLabel } from 'react-bootstrap';
import { Icon } from '@iconify/react';
import Swal from 'sweetalert2';
import EditSize from './components/editsize'; 
import EditColor from './components/editcolor';

const SizeColorManager = () => {
  const [sizes, setSizes] = useState([]);
  const [totalSizePages, setTotalSizePages] = useState(1);
  const [sizePage, setSizePage] = useState(1);

  const [colors, setColors] = useState([]);
  const [totalColorPages, setTotalColorPages] = useState(1);
  const [colorPage, setColorPage] = useState(1);

  const [sizeName, setSizeName] = useState('');
  const [sizeStatus, setSizeStatus] = useState('Active');
  const [colorName, setColorName] = useState('');
  const [colorStatus, setColorStatus] = useState('Active');

  const [fetchUserLogs] = useGetcolorsLogsMutation();
  const [fetchUserLogs1] = useGetsizesLogsMutation();
  const [addColor] = useAddColorMutation();
  const [addSize] = useAddSizeMutation();
  const [editStateSize] = useEditStatesizeMutation();
  const [editStateColor] = useEditStatecolorMutation();
  const [editNameSize] = useEditStatesizenameMutation();
  const [editNameColor] = useEditStatecolornameMutation();


  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [showModal, setShowModal] = useState(false); 
  const handleCloseModal = () => setShowModal1(false);
  const [showModal1, setShowModal1] = useState(false); 
  const handleCloseModal1 = () => setShowModal(false);

  useEffect(() => {
    const fetchSizes = async () => {
      try {
        const skip = (sizePage - 1) * 15;
        const result = await fetchUserLogs1({ page: sizePage, limit: 15, skip }).unwrap();
        setSizes(result.sizes);
        setTotalSizePages(result.totalPages);
      } catch (error) {
        console.error("Error fetching size logs:", error);
      }
    };
    fetchSizes();
  }, [sizePage]);

  useEffect(() => {
    const fetchColors = async () => {
      try {
        const skip = (colorPage - 1) * 15;
        const result = await fetchUserLogs({ page: colorPage, limit: 15, skip }).unwrap();
        setColors(result.colors);
        setTotalColorPages(result.totalPages);
      } catch (error) {
        console.error("Error fetching color logs:", error);
      }
    };
    fetchColors();
  }, [colorPage]);

  const handleAddSize = async () => {
    const newSize = { name: sizeName, status: sizeStatus };
    try {
      const result = await addSize(newSize).unwrap();
      setSizes(prev => [result.size, ...prev]);
      setSizeName('');
      setSizeStatus('Active');
      Swal.fire('Success!', 'Size added successfully.', 'success');
    } catch (error) {
      console.error('Error adding size:', error);
      Swal.fire('Error!', 'There was a problem adding the size.', 'error');
    }
  };

  const handleAddColor = async () => {
    const newColor = { name: colorName, status: colorStatus };
    try {
      const result = await addColor(newColor).unwrap();
      setColors(prev => [result.color, ...prev]);
      setColorName('');
      setColorStatus('Active');
      Swal.fire('Success!', 'Color added successfully.', 'success');
    } catch (error) {
      console.error('Error adding color:', error);
      Swal.fire('Error!', 'There was a problem adding the color.', 'error');
    }
  };

  const toggleStatus = async (setFn, id, list, mutationFn, label) => {
    const target = list.find((item) => item.id === id);
    if (!target) return;
    const newStatus = target.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await mutationFn({ id, status: newStatus }).unwrap();
      setFn(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
      Swal.fire('Success!', `${label} status updated to ${newStatus}.`, 'success');
    } catch (error) {
      console.error(`Error updating ${label.toLowerCase()} status:`, error);
      Swal.fire('Error!', `Failed to update ${label.toLowerCase()} status.`, 'error');
    }
  };


  const handleEditSize = (size) => {
        setSelectedSize(size);
        setShowModal1(true);
    }

  const handleEditColor = (color) => {
        setSelectedColor(color);
        setShowModal(true);
    }

   const handleSaveEdit = async (updatedSize) => {
    try {
      await editNameSize({ id: updatedSize.id, name: updatedSize.name }).unwrap();
      setSizes((prev) =>
        prev.map((s) => (s.id === updatedSize.id ? { ...s, ...updatedSize } : s))
      );
      Swal.fire('Success!', 'Size updated successfully.', 'success');
    } catch (error) {
      console.error('Error saving size update:', error);
      Swal.fire('Error!', 'Failed to update size.', 'error');
    }
  };

  const handleSaveEditColor = async (updatedColor) => {
    try {
      await editNameColor({ id: updatedColor.id, name: updatedColor.name }).unwrap();
     setColors((prev) =>
  prev.map((c) => (c.id === updatedColor.id ? { ...c, ...updatedColor } : c))
);
      Swal.fire('Success!', 'Color updated successfully.', 'success');
    } catch (error) {
      console.error('Error saving Color update:', error);
      Swal.fire('Error!', 'Failed to update Color.', 'error');
    }
  };

  return (
    <div>
      <ComponentContainerCard title="Add Size">
        <Form className="row g-3">
          <FormGroup className="col-md-2">
            <FormLabel>Size Name</FormLabel>
            <Form.Control
              type="text"
              value={sizeName}
              onChange={(e) => setSizeName(e.target.value)}
              placeholder="Enter size name"
            />
          </FormGroup>
          <FormGroup className="col-md-2 d-flex align-items-end">
            <Button onClick={handleAddSize}>Add Size</Button>
          </FormGroup>
        </Form>

        <Table striped bordered hover className="mt-4">
          <thead>
            <tr><th>ID</th><th>Name</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody>
            {sizes.map((s) => (
              <tr key={s.id}>
                <td>{s.id}</td>
                <td>{s.name}</td>
                <td>{s.status}</td>
                {/* <td>
                  <Button
                    size="sm"
                    onClick={() => toggleStatus(setSizes, s.id, sizes, editStateSize, 'Size')}
                    variant={s.status === 'Active' ? 'danger' : 'success'}
                  >
                    {s.status === 'Active' ? 'Deactivate' : 'Activate'}
                  </Button>
                </td> */}

                <td className="d-flex flex-wrap-nowrap">
                  <Button
                    variant="primary"
                    className="d-flex align-items-center"
                    style={{
                      minWidth: 'auto',
                      marginLeft: 3,
                      marginBottom: '10px',
                      paddingTop: '0.5rem',
                      paddingBottom: '0.5rem',
                      fontSize: '1rem',
                      height: '30px',
                      borderRadius: '15px',
                      backgroundColor: '#fd7e14',
                      borderColor: '#fd7e14',
                    }}
                    onClick={() => handleEditSize(s)}
                  >
                    <Icon icon="mdi:pencil" width={20} height={20} style={{ marginRight: '4px' }} />
                    <span style={{ fontSize: '0.75rem' }}>
                      {'Edit'}
                    </span>
                  </Button>
                  <Button
                    className="d-flex align-items-center"
                    style={{
                      minWidth: 'auto',
                      marginLeft: 3,
                      marginBottom: '10px',
                      paddingTop: '0.5rem',
                      paddingBottom: '0.5rem',
                      fontSize: '1rem',
                      height: '30px',
                      borderRadius: '15px',
                      backgroundColor: s.status === 'Active' ? '#dc3545' : '#28a745', 
                      borderColor: s.status === 'Active' ? '#dc3545' : '#28a745',
                      color: '#fff',
                    }}
                    onClick={() => toggleStatus(setSizes, s.id, sizes, editStateSize, 'Size')}
                  >
                    <Icon
                      icon={s.status === 'Active' ? 'mdi:ban' : 'mdi:check-circle'}
                      width={20}
                      height={20}
                      style={{ marginRight: '4px' }}
                    />
                    <span style={{ fontSize: '0.75rem' }}>
                      {s.status === 'Active' ? 'Deactivate' : 'Active'}
                    </span>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>

         <EditSize
        show={showModal1}
        onClose={handleCloseModal}
        size={selectedSize}
        onSave={handleSaveEdit}
      />

        <div className="d-flex justify-content-end mt-4">
          <Pagination>
            <Pagination.Prev disabled={sizePage === 1} onClick={() => setSizePage(sizePage - 1)} />
            {Array.from({ length: totalSizePages }, (_, i) => (
              <Pagination.Item key={i + 1} active={i + 1 === sizePage} onClick={() => setSizePage(i + 1)}>{i + 1}</Pagination.Item>
            ))}
            <Pagination.Next disabled={sizePage === totalSizePages} onClick={() => setSizePage(sizePage + 1)} />
          </Pagination>
        </div>
      </ComponentContainerCard>

      <ComponentContainerCard title="Add Color">
        <Form className="row g-3">
          <FormGroup className="col-md-2">
            <FormLabel>Color Name</FormLabel>
            <Form.Control
              type="text"
              value={colorName}
              onChange={(e) => setColorName(e.target.value)}
              placeholder="Enter color name"
            />
          </FormGroup>
          <FormGroup className="col-md-2 d-flex align-items-end">
            <Button onClick={handleAddColor}>Add Color</Button>
          </FormGroup>
        </Form>

        <Table striped bordered hover className="mt-4">
          <thead>
            <tr><th>ID</th><th>Name</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody>
            {colors.map((c) => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>{c.color}</td>
                <td>{c.status}</td>
                {/* <td>
                  <Button
                    size="sm"
                    onClick={() => toggleStatus(setColors, c.id, colors, editStateColor, 'Color')}
                    variant={c.status === 'Active' ? 'danger' : 'success'}
                  >
                    {c.status === 'Active' ? 'Deactivate' : 'Activate'}
                  </Button>
                </td> */}
                  <td className="d-flex flex-wrap-nowrap">
                  <Button
                    variant="primary"
                    className="d-flex align-items-center"
                    style={{
                      minWidth: 'auto',
                      marginLeft: 3,
                      marginBottom: '10px',
                      paddingTop: '0.5rem',
                      paddingBottom: '0.5rem',
                      fontSize: '1rem',
                      height: '30px',
                      borderRadius: '15px',
                      backgroundColor: '#fd7e14',
                      borderColor: '#fd7e14',
                    }}
                    onClick={() => handleEditColor(c)}
                  >
                    <Icon icon="mdi:pencil" width={20} height={20} style={{ marginRight: '4px' }} />
                    <span style={{ fontSize: '0.75rem' }}>
                      {'Edit'}
                    </span>
                  </Button>
                  <Button
                    className="d-flex align-items-center"
                    style={{
                      minWidth: 'auto',
                      marginLeft: 3,
                      marginBottom: '10px',
                      paddingTop: '0.5rem',
                      paddingBottom: '0.5rem',
                      fontSize: '1rem',
                      height: '30px',
                      borderRadius: '15px',
                      backgroundColor: c.status === 'Active' ? '#dc3545' : '#28a745', 
                      borderColor: c.status === 'Active' ? '#dc3545' : '#28a745',
                      color: '#fff',
                    }}
                    onClick={() => toggleStatus(setColors, c.id, colors, editStateColor, 'Color')}
                  >
                    <Icon
                      icon={c.status === 'Active' ? 'mdi:ban' : 'mdi:check-circle'}
                      width={20}
                      height={20}
                      style={{ marginRight: '4px' }}
                    />
                    <span style={{ fontSize: '0.75rem' }}>
                      {c.status === 'Active' ? 'Deactivate' : 'Active'}
                    </span>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        <EditColor
        show={showModal}
        onClose={handleCloseModal1}
        color={selectedColor}
        onSave={handleSaveEditColor}
      />

        <div className="d-flex justify-content-end mt-4">
          <Pagination>
            <Pagination.Prev disabled={colorPage === 1} onClick={() => setColorPage(colorPage - 1)} />
            {Array.from({ length: totalColorPages }, (_, i) => (
              <Pagination.Item key={i + 1} active={i + 1 === colorPage} onClick={() => setColorPage(i + 1)}>{i + 1}</Pagination.Item>
            ))}
            <Pagination.Next disabled={colorPage === totalColorPages} onClick={() => setColorPage(colorPage + 1)} />
          </Pagination>
        </div>
      </ComponentContainerCard>
    </div>
  );
};

export default SizeColorManager;
