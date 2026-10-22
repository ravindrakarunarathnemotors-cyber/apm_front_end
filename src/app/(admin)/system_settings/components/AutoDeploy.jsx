'use client'

import { useState, useEffect } from 'react'
import { Button, Form, Row, Col } from 'react-bootstrap'
import { Icon } from '@iconify/react'
import Swal from 'sweetalert2'
import ComponentContainerCard from '@/components/ComponentContainerCard'
import {
  useGetAutoDeploySettingsQuery,
  useUpdateAutoDeploySettingsMutation,
  useGetServersQuery,
  useGetPostgresServersQuery,
  useGetDomainsQuery,
} from '@/store/features/apiSlice'

const AutoDeploy = () => {
  // 🔹 Fetch existing saved settings
  const { data: deployData, isLoading: isLoadingFetch } = useGetAutoDeploySettingsQuery()

  // 🔹 Fetch dropdown data
  const { data: servers = [] } = useGetServersQuery()
  const { data: pgServers = [] } = useGetPostgresServersQuery()
  const { data: domains = [] } = useGetDomainsQuery()

  const [updateAutoDeploy, { isLoading: isLoadingUpdate }] = useUpdateAutoDeploySettingsMutation()

  const [enabled, setEnabled] = useState(false)
  const [serverId, setServerId] = useState('')
  const [postgresId, setPostgresId] = useState('')
  const [domainId, setDomainId] = useState('')
  const [hasChanges, setHasChanges] = useState(false)

  // Populate state when API loads
  useEffect(() => {
    if (deployData) {
      setEnabled(deployData.enabled || false)
      setServerId(deployData.server_id ? String(deployData.server_id) : '')
      setPostgresId(deployData.postgres_server_id ? String(deployData.postgres_server_id) : '')
      setDomainId(deployData.domain_id ? String(deployData.domain_id) : '')
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
        server_id: Number(serverId),
        postgres_server_id: Number(postgresId),
        domain_id: Number(domainId),
      }).unwrap()

      setHasChanges(false)

      Swal.fire({
        icon: 'success',
        title: 'Saved!',
        text: 'Auto deployment settings updated successfully.',
        timer: 2000,
        showConfirmButton: false,
      })
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to update auto deployment settings!',
      })
    }
  }

  if (isLoadingFetch) return <p>Loading auto deployment settings...</p>

  return (
    <ComponentContainerCard title="Auto Deployment Settings">
      <form onSubmit={handleSubmit}>
        {/* Enable Switch */}
        <div className="mb-4">
          <Form.Check
            type="switch"
            id="autoDeploySwitch"
            label="Enable Auto Deployment"
            checked={enabled}
            onChange={(e) => {
              setEnabled(e.target.checked)
              handleChange()
            }}
          />
        </div>

        {/* 3 Column Layout */}
        <Row>
          {/* Code Server */}
          <Col md={4}>
            <div className="mb-3">
              <label className="form-label">Code Deployment Server</label>
              <select
                className="form-select"
                value={serverId}
                disabled={!enabled}
                onChange={(e) => {
                  setServerId(e.target.value)
                  handleChange()
                }}
                required>
                <option value="">Select Server</option>
                {servers.map((server) => (
                  <option key={server.id} value={server.id}>
                    {server.node_name} ({server.ip_address})
                  </option>
                ))}
              </select>
            </div>
          </Col>

          {/* PostgreSQL Server */}
          <Col md={4}>
            <div className="mb-3">
              <label className="form-label">PostgreSQL Server</label>
              <select
                className="form-select"
                value={postgresId}
                disabled={!enabled}
                onChange={(e) => {
                  setPostgresId(e.target.value)
                  handleChange()
                }}
                required>
                <option value="">Select PostgreSQL Server</option>
                {pgServers.map((pg) => (
                  <option key={pg.id} value={pg.id}>
                    {pg.node_name} ({pg.ip_address})
                  </option>
                ))}
              </select>
            </div>
          </Col>

          {/* Domain */}
          <Col md={4}>
            <div className="mb-3">
              <label className="form-label">Domain</label>
              <select
                className="form-select"
                value={domainId}
                disabled={!enabled}
                onChange={(e) => {
                  setDomainId(e.target.value)
                  handleChange()
                }}
                required>
                <option value="">Select Domain</option>
                {domains.map((domain) => (
                  <option key={domain.id} value={domain.id}>
                    {domain.domain_name}
                  </option>
                ))}
              </select>
            </div>
          </Col>
        </Row>

        {/* Save Button */}
        <div className="d-flex justify-content-end mt-3">
          <Button variant="primary" type="submit" disabled={isLoadingUpdate || !hasChanges}>
            <Icon icon="mdi:content-save" width={20} height={20} className="me-1" />
            {isLoadingUpdate ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </ComponentContainerCard>
  )
}

export default AutoDeploy
