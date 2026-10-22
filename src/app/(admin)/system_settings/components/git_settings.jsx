import { useState, useEffect } from 'react'
import { Button } from 'react-bootstrap'
import { Icon } from '@iconify/react'
import Swal from 'sweetalert2'
import ComponentContainerCard from '@/components/ComponentContainerCard'
import { useGetGitSettingsQuery, useUpdateGitSettingsMutation } from '@/store/features/apiSlice'

const GitSettings = () => {
  const { data: gitData, isLoading: isLoadingFetch } = useGetGitSettingsQuery()
  const [updateGitSettings, { isLoading: isLoadingUpdate }] = useUpdateGitSettingsMutation()

  const [gitUsername, setGitUsername] = useState('')
  const [gitEmail, setGitEmail] = useState('')
  const [gitToken, setGitToken] = useState('')
  const [hasChanges, setHasChanges] = useState(false)

  // Populate state when fetch finishes
  useEffect(() => {
    if (gitData) {
      setGitUsername(gitData.git_username || '')
      setGitEmail(gitData.git_email || '')
      setGitToken(gitData.git_token || '')
      setHasChanges(false)
    }
  }, [gitData])

  const handleChange = () => {
    if (!hasChanges) setHasChanges(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await updateGitSettings({
        git_username: gitUsername,
        git_email: gitEmail,
        git_token: gitToken,
      }).unwrap()

      setHasChanges(false)

      Swal.fire({
        icon: 'success',
        title: 'Saved!',
        text: 'Git settings saved successfully.',
        timer: 2000,
        showConfirmButton: false,
      })
    } catch (err) {
      console.error(err)

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to save Git settings!',
      })
    }
  }

  if (isLoadingFetch) return <p>Loading Git settings...</p>

  return (
    <ComponentContainerCard title="Git Configuration">
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="gitUsername" className="form-label">
            Git Username
          </label>
          <input
            type="text"
            className="form-control"
            id="gitUsername"
            placeholder="Enter Git username"
            value={gitUsername}
            onChange={(e) => {
              setGitUsername(e.target.value)
              handleChange()
            }}
            required
          />
        </div>

        <div className="mb-3">
          <label htmlFor="gitEmail" className="form-label">
            Git Email
          </label>
          <input
            type="email"
            className="form-control"
            id="gitEmail"
            placeholder="Enter Git email"
            value={gitEmail}
            onChange={(e) => {
              setGitEmail(e.target.value)
              handleChange()
            }}
            required
          />
        </div>

        <div className="mb-3">
          <label htmlFor="gitToken" className="form-label">
            Git Access Token
          </label>
          <input
            type="password"
            className="form-control"
            id="gitToken"
            placeholder="Enter Git access token"
            value={gitToken}
            onChange={(e) => {
              setGitToken(e.target.value)
              handleChange()
            }}
            required
          />
        </div>

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

export default GitSettings
