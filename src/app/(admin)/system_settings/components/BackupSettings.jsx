'use client'

import { useState, useEffect } from 'react'
import { Button, Form, Row, Col } from 'react-bootstrap'
import { Icon } from '@iconify/react'
import Swal from 'sweetalert2'
import ComponentContainerCard from '@/components/ComponentContainerCard'
import { useGetBackupSettingsQuery, useUpdateBackupSettingsMutation } from '@/store/features/apiSlice'

const BackupSettings = () => {
  // 🔹 Fetch existing saved settings
  const { data: deployData, isLoading: isLoadingFetch } = useGetBackupSettingsQuery()
  const [updateAutoDeploy, { isLoading: isLoadingUpdate }] = useUpdateBackupSettingsMutation()

  // 🔹 States
  const [enabled, setEnabled] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // 🔹 S3 Backup States
  const [s3Region, setS3Region] = useState('')
  const [s3Endpoint, setS3Endpoint] = useState('')
  const [s3AccessKey, setS3AccessKey] = useState('')
  const [s3SecretKey, setS3SecretKey] = useState('')
  const [s3BucketName, setS3BucketName] = useState('')
  const [s3ConvertUrl, setS3ConvertUrl] = useState('')

  // Populate state when API loads
  useEffect(() => {
    if (deployData) {
      setEnabled(deployData.enabled || false)
      setS3Region(deployData.db_backup_s3_region || '')
      setS3Endpoint(deployData.db_backup_s3_endpoint || '')
      setS3AccessKey(deployData.db_backup_s3_access_key || '')
      setS3SecretKey(deployData.db_backup_s3_secret_key || '')
      setS3BucketName(deployData.db_backup_s3_bucket_name || '')
      setS3ConvertUrl(deployData.db_backup_convert_s3_url || '')
      setHasChanges(false)
    }
  }, [deployData])

  const handleChange = () => {
    if (!hasChanges) setHasChanges(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await updateAutoDeploy({
        enabled,
        db_backup_s3_region: s3Region,
        db_backup_s3_endpoint: s3Endpoint,
        db_backup_s3_access_key: s3AccessKey,
        db_backup_s3_secret_key: s3SecretKey,
        db_backup_s3_bucket_name: s3BucketName,
        db_backup_convert_s3_url: s3ConvertUrl,
      }).unwrap()

      setHasChanges(false)

      Swal.fire({
        icon: 'success',
        title: 'Saved!',
        text: 'S3 Backup settings updated successfully.',
        timer: 2000,
        showConfirmButton: false,
      })
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to update backup settings!',
      })
    }
  }

  if (isLoadingFetch) return <p>Loading backup settings...</p>

  return (
    <ComponentContainerCard title="S3 Backup Settings">
      <form onSubmit={handleSubmit}>
        {/* Enable Switch */}
        <div className="mb-4">
          <Form.Check
            type="switch"
            id="autoDeploySwitch"
            label="Enable Systems Backup"
            checked={enabled}
            onChange={(e) => {
              setEnabled(e.target.checked)
              handleChange()
            }}
          />
        </div>

        {/* --- S3 Configuration Section --- */}
        <Row>
          {/* Region */}
          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>S3 Region</Form.Label>
              <Form.Control
                type="text"
                placeholder="eu-central-2"
                value={s3Region}
                disabled={!enabled}
                onChange={(e) => {
                  setS3Region(e.target.value)
                  handleChange()
                }}
                required={enabled}
              />
            </Form.Group>
          </Col>

          {/* Endpoint */}
          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>S3 Endpoint</Form.Label>
              <Form.Control
                type="text"
                placeholder="i4i4.fra.idrivee2..."
                value={s3Endpoint}
                disabled={!enabled}
                onChange={(e) => {
                  setS3Endpoint(e.target.value)
                  handleChange()
                }}
                required={enabled}
              />
            </Form.Group>
          </Col>

          {/* Bucket Name */}
          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>S3 Bucket Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="sql-backup"
                value={s3BucketName}
                disabled={!enabled}
                onChange={(e) => {
                  setS3BucketName(e.target.value)
                  handleChange()
                }}
                required={enabled}
              />
            </Form.Group>
          </Col>
        </Row>

        <Row>
          {/* Access Key */}
          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>S3 Access Key</Form.Label>
              <Form.Control
                type="text"
                value={s3AccessKey}
                disabled={!enabled}
                onChange={(e) => {
                  setS3AccessKey(e.target.value)
                  handleChange()
                }}
                required={enabled}
              />
            </Form.Group>
          </Col>

          {/* Secret Key */}
          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>S3 Secret Key</Form.Label>
              <Form.Control
                type="password"
                value={s3SecretKey}
                disabled={!enabled}
                onChange={(e) => {
                  setS3SecretKey(e.target.value)
                  handleChange()
                }}
                required={enabled}
              />
            </Form.Group>
          </Col>

          {/* Public URL */}
          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>S3 Public URL (Convert)</Form.Label>
              <Form.Control
                type="url"
                placeholder="https://..."
                value={s3ConvertUrl}
                disabled={!enabled}
                onChange={(e) => {
                  setS3ConvertUrl(e.target.value)
                  handleChange()
                }}
                required={enabled}
              />
            </Form.Group>
          </Col>
        </Row>

        {/* Save Button */}
        <div className="d-flex justify-content-end mt-3">
          <Button variant="primary" type="submit" disabled={isLoadingUpdate || !hasChanges}>
            <Icon icon="mdi:content-save" width={20} height={20} className="me-1" />
            {isLoadingUpdate ? 'Saving...' : 'Save Backup Settings'}
          </Button>
        </div>
      </form>
    </ComponentContainerCard>
  )
}

export default BackupSettings
