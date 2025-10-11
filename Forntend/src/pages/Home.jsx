import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Typography, Space, ConfigProvider, Badge, Modal, Form, Input, message, Steps, Upload, Select, DatePicker, Table, Tag } from 'antd';
import { LogoutOutlined, UserOutlined, VideoCameraOutlined, TeamOutlined, SettingOutlined, PlusOutlined, InboxOutlined, FileAddOutlined, SearchOutlined, FilterOutlined, FileTextOutlined, CheckCircleOutlined, CloseCircleOutlined, LockOutlined, CopyOutlined, LinkOutlined, DownloadOutlined, FilePdfOutlined } from '@ant-design/icons';
import { adminLogin, registerDoctor, createClaim, getAllClaims, createMeeting } from '../services/api';

const { Title, Text } = Typography;
const { Dragger } = Upload;
const { RangePicker } = DatePicker;

function Home() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [claimForm] = Form.useForm();
  const [adminLoginForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [fileList, setFileList] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState([null, null]);
  const [adminToken, setAdminToken] = useState(null);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [claimsData, setClaimsData] = useState([]);
  const [statistics, setStatistics] = useState({
    totalClaims: 0,
    openClaims: 0,
    closedClaims: 0
  });
  const [step1Data, setStep1Data] = useState(null);
  const [joiningMeetingId, setJoiningMeetingId] = useState(null);

  // Get user token from localStorage using useMemo
  const user = useMemo(() => JSON.parse(localStorage.getItem('user') || '{}'), []);
  const userToken = useMemo(() => user.token, [user]);

  // Fetch claims on component mount
  useEffect(() => {
    if (userToken) {
      fetchClaims();
    }
  }, [userToken]);

  const fetchClaims = async () => {
    try {
      const response = await getAllClaims(userToken);
      if (response.success) {
        const claims = response.data.map((claim, index) => ({
          key: claim._id,
          claimId: claim.claimId,
          patientMobile: claim.patientMobile,
          hospitalLocation: `${claim.hospitalCity}, ${claim.hospitalState}`,
          status: claim.status,
          created: new Date(claim.createdAt).toLocaleDateString('en-IN'),
        }));
        setClaimsData(claims);

        // Calculate statistics
        const total = claims.length;
        const open = claims.filter(c => c.status === 'open').length;
        const closed = claims.filter(c => c.status === 'closed').length;
        setStatistics({ totalClaims: total, openClaims: open, closedClaims: closed });
      }
    } catch (error) {
      console.error('Error fetching claims:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const showModal = () => {
    // Check if admin is logged in
    if (!isAdminLoggedIn) {
      setIsAdminLoginModalOpen(true);
    } else {
      setIsModalOpen(true);
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
  };

  const handleAdminLoginCancel = () => {
    setIsAdminLoginModalOpen(false);
    adminLoginForm.resetFields();
  };

  const handleAdminLogin = async (values) => {
    setLoading(true);
    try {
      const response = await adminLogin(values.email, values.password);
      
      if (response.success) {
        setAdminToken(response.data.token);
        setIsAdminLoggedIn(true);
        message.success('Admin login successful!');
        setIsAdminLoginModalOpen(false);
        adminLoginForm.resetFields();
        setLoading(false);
        // Now open doctor creation modal
        setIsModalOpen(true);
      }
    } catch (error) {
      message.error(error.message || 'Admin login failed. Please try again.');
      setLoading(false);
    }
  };

  const showClaimModal = () => {
    setIsClaimModalOpen(true);
  };

  const handleClaimCancel = () => {
    setIsClaimModalOpen(false);
    claimForm.resetFields();
    setCurrentStep(0);
    setFileList([]);
    setStep1Data(null); // Clear saved step 1 data
  };

  const handleCreateDoctor = async (values) => {
    setLoading(true);
    try {
      const response = await registerDoctor(values, adminToken);
      
      if (response.success) {
        message.success('Doctor created successfully!');
        setIsModalOpen(false);
        form.resetFields();
      }
      setLoading(false);
    } catch (error) {
      message.error(error.message || 'Failed to create doctor. Please try again.');
      setLoading(false);
    }
  };

  const handleNextStep = async () => {
    try {
      // Validate and get values from step 1
      const values = await claimForm.validateFields();
      console.log('Step 1 values validated and saved:', values);
      
      // Store step 1 data before moving to step 2
      setStep1Data(values);
      setCurrentStep(1);
    } catch (error) {
      console.error('Step 1 validation error:', error);
      message.error('Please fill all required fields!');
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(0);
  };

  const handleCreateClaim = async () => {
    // Check if step 1 data exists
    if (!step1Data) {
      message.error('Step 1 data is missing. Please go back and fill the form again.');
      setCurrentStep(0);
      return;
    }

    setLoading(true);
    try {
      // Use saved step 1 data instead of trying to get it from form
      const claimData = {
        claimId: step1Data.claimId,
        patientName: step1Data.patientName,
        patientMobile: step1Data.patientMobile,
        hospitalCity: step1Data.hospitalCity,
        hospitalState: step1Data.hospitalState,
        patientLanguage: step1Data.patientLanguage,
      };
      
      // Debug: Log what we're sending
      console.log('=== CLAIM FORM DEBUG ===');
      console.log('Step 1 saved data:', step1Data);
      console.log('Claim data to send:', claimData);
      console.log('Files to upload:', fileList);
      console.log('User token exists:', !!userToken);
      console.log('=======================');
      
      // Call API to create claim with files
      const response = await createClaim(claimData, fileList, userToken);
      
      if (response.success) {
        message.success('Claim created successfully!');
        handleClaimCancel();
        // Refresh claims list
        fetchClaims();
      }
      setLoading(false);
    } catch (error) {
      console.error('Error creating claim:', error);
      message.error(error.message || 'Failed to create claim. Please try again.');
      setLoading(false);
    }
  };

  const uploadProps = {
    name: 'file',
    multiple: true,
    fileList: fileList,
    beforeUpload: (file) => {
      // Create a proper file list item
      const fileItem = {
        uid: file.uid || `${Date.now()}-${file.name}`,
        name: file.name,
        status: 'done',
        originFileObj: file, // Store the actual file object
      };
      setFileList([...fileList, fileItem]);
      return false; // Prevent auto upload
    },
    onRemove: (file) => {
      const newFileList = fileList.filter(item => item.uid !== file.uid);
      setFileList(newFileList);
    },
  };

  const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
  ];

  const languages = [
    'Hindi', 'English', 'Bengali', 'Telugu', 'Marathi', 'Tamil', 'Gujarati',
    'Urdu', 'Kannada', 'Malayalam', 'Odia', 'Punjabi'
  ];

  const handleSearch = (value) => {
    setSearchText(value);
    console.log('Search:', value);
    // Add your search logic here
  };

  const handleStatusChange = (value) => {
    setStatusFilter(value);
    console.log('Status Filter:', value);
    // Add your filter logic here
  };

  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
    console.log('Date Range:', dates);
    // Add your date filter logic here
  };

  const handleClearFilters = () => {
    setSearchText('');
    setStatusFilter('all');
    setDateRange([null, null]);
    message.info('Filters cleared');
  };

  const handleJoinMeeting = async (record) => {
    try {
      setJoiningMeetingId(record.key);
      // Create or get existing meeting for this claim
      const response = await createMeeting(record.key, userToken);
      
      if (response.success) {
        const { roomId } = response.data;
        message.success(`Joining meeting for Claim ${record.claimId}`);
        
        // Navigate to video call page with roomId
        navigate(`/meeting/${roomId}?role=doctor`);
      }
    } catch (error) {
      console.error('Error creating meeting:', error);
      message.error(error.message || 'Failed to join meeting');
      setJoiningMeetingId(null);
    }
  };

  const handleCopyPatientLink = async (record) => {
    try {
      // Create or get existing meeting for this claim
      const response = await createMeeting(record.key, userToken);
      
      if (response.success) {
        const { patientLink } = response.data;
        // Copy to clipboard
        await navigator.clipboard.writeText(patientLink);
        message.success('Patient link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error copying patient link:', error);
      message.error(error.message || 'Failed to copy link');
    }
  };

  const handleDownloadPDF = async (record) => {
    try {
      message.loading({ content: 'Generating PDF...', key: 'pdf' });
      
      // Download PDF directly
      const pdfUrl = `http://localhost:5000/api/claims/${record.claimId}/pdf`;
      
      // Create temporary link and trigger download
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `claim-${record.claimId}-report.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      message.success({ content: 'PDF download started!', key: 'pdf', duration: 2 });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      message.error({ content: 'Failed to download PDF', key: 'pdf', duration: 2 });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'blue';
      case 'closed':
        return 'green';
      case 'pending':
        return 'warning';
      case 'in_progress':
        return 'processing';
      default:
        return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'open':
        return 'Open';
      case 'closed':
        return '✅ Completed';
      case 'pending':
        return 'Pending';
      case 'in_progress':
        return 'In Progress';
      default:
        return status;
    }
  };

  const columns = [
    {
      title: <span style={{ fontWeight: 700, color: '#000000' }}>Claim #</span>,
      dataIndex: 'claimId',
      key: 'claimId',
      fixed: 'left',
      render: (text) => <Text strong style={{ color: '#667eea' }}>{text}</Text>,
    },
    {
      title: <span style={{ fontWeight: 700, color: '#000000' }}>Patient Mobile</span>,
      dataIndex: 'patientMobile',
      key: 'patientMobile',
      render: (text) => <Text style={{ color: '#000000' }}>{text}</Text>,
    },
    {
      title: <span style={{ fontWeight: 700, color: '#000000' }}>Hospital Location</span>,
      dataIndex: 'hospitalLocation',
      key: 'hospitalLocation',
      render: (text) => <Text style={{ color: '#000000' }}>{text}</Text>,
    },
    {
      title: <span style={{ fontWeight: 700, color: '#000000' }}>Status</span>,
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)} style={{ fontWeight: 600 }}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: <span style={{ fontWeight: 700, color: '#000000' }}>Created</span>,
      dataIndex: 'created',
      key: 'created',
      render: (text) => <Text style={{ color: '#6b7280' }}>{text}</Text>,
    },
    {
      title: <span style={{ fontWeight: 700, color: '#000000' }}>Actions</span>,
      key: 'actions',
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            icon={<VideoCameraOutlined />}
            onClick={() => handleJoinMeeting(record)}
            loading={joiningMeetingId === record.key}
            disabled={joiningMeetingId !== null && joiningMeetingId !== record.key}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
            }}
          >
            Join
          </Button>
          <Button
            icon={<CopyOutlined />}
            onClick={() => handleCopyPatientLink(record)}
            style={{
              borderRadius: '6px',
              border: '2px solid #667eea',
              color: '#667eea',
              fontWeight: 600,
            }}
            title="Copy Patient Link"
          >
            Copy Link
          </Button>
          <Button
            type="default"
            icon={<FilePdfOutlined />}
            onClick={() => handleDownloadPDF(record)}
            style={{
              borderRadius: '6px',
              border: '2px solid #ef4444',
              color: '#ef4444',
              fontWeight: 600,
              background: '#ffffff',
            }}
            title="Download PDF Report"
          >
            PDF
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#667eea',
          colorText: '#000000',
          colorBorder: '#667eea',
          fontFamily: 'Inter, sans-serif',
        },
      }}
    >
      <div style={{
        padding: '24px',
        minHeight: '100vh',
        background: 'transparent',
        position: 'relative'
      }}>
        {/* Header */}
        <div className="animate-fade-in" style={{
          maxWidth: '1200px',
          margin: '0 auto 24px',
          background: '#ffffff',
          padding: '24px',
          borderRadius: '16px',
          border: '2px solid #667eea',
          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.15)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Title level={2} style={{ margin: 0, color: '#000000', fontWeight: 700 }}>
              Dashboard
            </Title>
            <Text style={{ color: '#6b7280', fontSize: '16px' }}>
              <UserOutlined style={{ color: '#667eea', marginRight: '8px' }} />
              {user.email || 'User'}
            </Text>
          </div>
          <Space size="middle">
            <Button
              type="primary"
              icon={<FileAddOutlined />}
              onClick={showClaimModal}
              size="large"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '8px',
                height: '45px',
                padding: '0 24px',
                fontSize: '16px',
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
              }}
            >
              Create Claim
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={showModal}
              size="large"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '8px',
                height: '45px',
                padding: '0 24px',
                fontSize: '16px',
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
              }}
            >
              Create Doctor
            </Button>
            <Button
              type="primary"
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              size="large"
              style={{
                background: '#000000',
                border: 'none',
                borderRadius: '8px',
                height: '45px',
                padding: '0 24px',
                fontSize: '16px',
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#1f2937';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#000000';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
              }}
            >
              Logout
            </Button>
          </Space>
        </div>

        {/* Hero Header - Search and Filters */}
        <div className="animate-slide-in" style={{
          maxWidth: '1200px',
          margin: '0 auto 24px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '32px',
          borderRadius: '16px',
          boxShadow: '0 10px 40px rgba(102, 126, 234, 0.2)',
        }}>
          <Title level={3} style={{ color: '#ffffff', marginBottom: '24px', fontWeight: 700 }}>
            <FilterOutlined style={{ marginRight: '12px' }} />
            Filter Claims
          </Title>
          
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Search Input */}
            <Input
              size="large"
              placeholder="Search by Claim ID, Patient Name, or Mobile Number..."
              prefix={<SearchOutlined style={{ color: '#667eea', fontSize: '18px' }} />}
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
              style={{
                borderRadius: '8px',
                border: '2px solid #ffffff',
                background: '#ffffff',
                fontSize: '16px',
                padding: '12px 16px',
                height: '50px'
              }}
              allowClear
            />

            {/* Filters Row */}
            <Space size="middle" wrap style={{ width: '100%' }}>
              {/* Status Filter */}
              <div style={{ minWidth: '250px' }}>
                <Text strong style={{ color: '#ffffff', display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                  Status
                </Text>
                <Select
                  size="large"
                  value={statusFilter}
                  onChange={handleStatusChange}
                  style={{ width: '100%', borderRadius: '8px' }}
                  options={[
                    { label: 'All Claims', value: 'all' },
                    { label: 'Open', value: 'open' },
                    { label: 'Closed', value: 'closed' },
                    { label: 'Pending', value: 'pending' },
                    { label: 'In Progress', value: 'in_progress' },
                  ]}
                />
              </div>

              {/* Date Range Filter */}
              <div style={{ minWidth: '300px' }}>
                <Text strong style={{ color: '#ffffff', display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                  Date Range
                </Text>
                <RangePicker
                  size="large"
                  value={dateRange}
                  onChange={handleDateRangeChange}
                  style={{ width: '100%', borderRadius: '8px' }}
                  format="DD/MM/YYYY"
                  placeholder={['Start Date', 'End Date']}
                />
              </div>

              {/* Clear Filters Button */}
              <div style={{ marginTop: '28px' }}>
                <Button
                  size="large"
                  onClick={handleClearFilters}
                  style={{
                    background: '#ffffff',
                    color: '#667eea',
                    border: '2px solid #ffffff',
                    borderRadius: '8px',
                    height: '40px',
                    padding: '0 24px',
                    fontWeight: 600,
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f0fdf4';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </Space>

            {/* Active Filters Display */}
            {(searchText || statusFilter !== 'all' || (dateRange && dateRange[0])) && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.2)',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.3)'
              }}>
                <Text strong style={{ color: '#ffffff', fontSize: '14px' }}>
                  Active Filters: 
                  {searchText && ` Search: "${searchText}"`}
                  {statusFilter !== 'all' && ` | Status: ${statusFilter}`}
                  {dateRange && dateRange[0] && ` | Date Range Selected`}
                </Text>
              </div>
            )}
          </Space>
        </div>

        {/* Statistics Cards */}
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto 24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px'
        }}>
          {/* Total Claims Card */}
          <Card
            className="animate-fade-in"
            style={{
              borderRadius: '16px',
              border: '2px solid #667eea',
              background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%)',
              boxShadow: '0 4px 20px rgba(102, 126, 234, 0.15)',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            hoverable
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(16, 185, 129, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(16, 185, 129, 0.15)';
            }}
          >
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <Text style={{ color: '#6b7280', fontSize: '14px', fontWeight: 500 }}>
                  Total Claims
                </Text>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                }}>
                  <FileTextOutlined style={{ fontSize: '24px', color: '#ffffff' }} />
                </div>
              </div>
              <Title level={2} style={{ margin: 0, color: '#000000', fontWeight: 700 }}>
                {statistics.totalClaims}
              </Title>
              <Text style={{ color: '#667eea', fontSize: '12px', fontWeight: 600 }}>
                ● All time claims
              </Text>
            </Space>
          </Card>

          {/* Open Claims Card */}
          <Card
            className="animate-fade-in"
            style={{
              borderRadius: '16px',
              border: '2px solid #667eea',
              background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%)',
              boxShadow: '0 4px 20px rgba(102, 126, 234, 0.15)',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              animationDelay: '0.1s'
            }}
            hoverable
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(16, 185, 129, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(16, 185, 129, 0.15)';
            }}
          >
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <Text style={{ color: '#6b7280', fontSize: '14px', fontWeight: 500 }}>
                  Open Claims
                </Text>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                }}>
                  <CheckCircleOutlined style={{ fontSize: '24px', color: '#ffffff' }} />
                </div>
              </div>
              <Title level={2} style={{ margin: 0, color: '#000000', fontWeight: 700 }}>
                {statistics.openClaims}
              </Title>
              <Text style={{ color: '#f59e0b', fontSize: '12px', fontWeight: 600 }}>
                ● Pending resolution
              </Text>
            </Space>
          </Card>

          {/* Closed Claims Card */}
          <Card
            className="animate-fade-in"
            style={{
              borderRadius: '16px',
              border: '2px solid #667eea',
              background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%)',
              boxShadow: '0 4px 20px rgba(102, 126, 234, 0.15)',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              animationDelay: '0.2s'
            }}
            hoverable
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(16, 185, 129, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(16, 185, 129, 0.15)';
            }}
          >
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <Text style={{ color: '#6b7280', fontSize: '14px', fontWeight: 500 }}>
                  Closed Claims
                </Text>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: 'linear-gradient(135deg, #000000 0%, #1f2937 100%)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
                }}>
                  <CloseCircleOutlined style={{ fontSize: '24px', color: '#ffffff' }} />
                </div>
              </div>
              <Title level={2} style={{ margin: 0, color: '#000000', fontWeight: 700 }}>
                {statistics.closedClaims}
              </Title>
              <Text style={{ color: '#059669', fontSize: '12px', fontWeight: 600 }}>
                ● Successfully resolved
              </Text>
            </Space>
          </Card>
        </div>

        {/* Claims Table */}
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto 24px',
        }}>
          <Card
            className="animate-fade-in"
            style={{
              borderRadius: '16px',
              border: '2px solid #667eea',
              background: '#ffffff',
              boxShadow: '0 4px 20px rgba(102, 126, 234, 0.1)',
            }}
          >
            <Title level={3} style={{ color: '#000000', marginBottom: '24px', fontWeight: 700 }}>
              <FileTextOutlined style={{ marginRight: '12px', color: '#667eea' }} />
              Claims List
            </Title>
            <Table
              columns={columns}
              dataSource={claimsData}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `Total ${total} claims`,
                style: { marginTop: '16px' }
              }}
              scroll={{ x: 1200 }}
              style={{
                borderRadius: '8px',
              }}
              rowClassName={(record, index) => 
                index % 2 === 0 ? 'table-row-light' : 'table-row-dark'
              }
            />
          </Card>
        </div>

        {/* Admin Login Modal */}
        <Modal
          title={
            <Title level={3} style={{ margin: 0, color: '#000000' }}>
              <LockOutlined style={{ marginRight: '12px', color: '#667eea' }} />
              Admin Login Required
            </Title>
          }
          open={isAdminLoginModalOpen}
          onCancel={handleAdminLoginCancel}
          footer={null}
          width={450}
          centered
          styles={{
            header: {
              borderBottom: '2px solid #667eea',
              paddingBottom: '16px'
            }
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '24px', marginTop: '16px' }}>
            <Text style={{ color: '#6b7280', fontSize: '14px' }}>
              Only admin can create doctors. Please login with admin credentials.
            </Text>
          </div>

          <Form
            form={adminLoginForm}
            layout="vertical"
            onFinish={handleAdminLogin}
          >
            <Form.Item
              label={<span style={{ color: '#000000', fontWeight: 600 }}>Admin Email</span>}
              name="email"
              rules={[
                {
                  required: true,
                  message: 'Please input admin email!',
                },
                {
                  type: 'email',
                  message: 'Please enter a valid email!',
                },
              ]}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#667eea' }} />}
                placeholder="Enter admin email"
                size="large"
                style={{
                  borderRadius: '8px',
                  border: '2px solid #e5e7eb',
                }}
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ color: '#000000', fontWeight: 600 }}>Password</span>}
              name="password"
              rules={[
                {
                  required: true,
                  message: 'Please input password!',
                },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#667eea' }} />}
                placeholder="Enter password"
                size="large"
                style={{
                  borderRadius: '8px',
                  border: '2px solid #e5e7eb',
                }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: '24px' }}>
              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button
                  onClick={handleAdminLoginCancel}
                  size="large"
                  style={{
                    borderRadius: '8px',
                    height: '45px',
                    padding: '0 24px',
                    border: '2px solid #e5e7eb',
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  size="large"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    height: '45px',
                    padding: '0 24px',
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                  }}
                >
                  Login as Admin
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* Create Doctor Modal */}
        <Modal
          title={
            <Title level={3} style={{ margin: 0, color: '#000000' }}>
              Create New Doctor
            </Title>
          }
          open={isModalOpen}
          onCancel={handleCancel}
          footer={null}
          width={500}
          centered
          styles={{
            header: {
              borderBottom: '2px solid #667eea',
              paddingBottom: '16px'
            }
          }}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCreateDoctor}
            style={{ marginTop: '24px' }}
          >
            <Form.Item
              label={<span style={{ color: '#000000', fontWeight: 600 }}>Name</span>}
              name="name"
              rules={[
                {
                  required: true,
                  message: 'Please input doctor name!',
                },
                {
                  min: 3,
                  message: 'Name must be at least 3 characters!',
                },
              ]}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#667eea' }} />}
                placeholder="Enter doctor name"
                size="large"
                style={{
                  borderRadius: '8px',
                  border: '2px solid #e5e7eb',
                }}
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ color: '#000000', fontWeight: 600 }}>Email</span>}
              name="email"
              rules={[
                {
                  required: true,
                  message: 'Please input doctor email!',
                },
                {
                  type: 'email',
                  message: 'Please enter a valid email!',
                },
              ]}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#667eea' }} />}
                placeholder="Enter doctor email"
                size="large"
                style={{
                  borderRadius: '8px',
                  border: '2px solid #e5e7eb',
                }}
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ color: '#000000', fontWeight: 600 }}>Password</span>}
              name="password"
              rules={[
                {
                  required: true,
                  message: 'Please input password!',
                },
                {
                  min: 6,
                  message: 'Password must be at least 6 characters!',
                },
              ]}
            >
              <Input.Password
                placeholder="Enter password"
                size="large"
                style={{
                  borderRadius: '8px',
                  border: '2px solid #e5e7eb',
                }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: '24px' }}>
              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button
                  onClick={handleCancel}
                  size="large"
                  style={{
                    borderRadius: '8px',
                    height: '45px',
                    padding: '0 24px',
                    border: '2px solid #e5e7eb',
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  size="large"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    height: '45px',
                    padding: '0 24px',
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                  }}
                >
                  Create Doctor
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* Create Claim Modal - 2 Steps */}
        <Modal
          title={
            <Title level={3} style={{ margin: 0, color: '#000000' }}>
              Create New Claim
            </Title>
          }
          open={isClaimModalOpen}
          onCancel={handleClaimCancel}
          footer={null}
          width={700}
          centered
          styles={{
            header: {
              borderBottom: '2px solid #667eea',
              paddingBottom: '16px'
            }
          }}
        >
          <Steps
            current={currentStep}
            style={{ marginTop: '24px', marginBottom: '32px' }}
            items={[
              {
                title: 'Patient Information',
                icon: <UserOutlined />,
              },
              {
                title: 'Upload Documents',
                icon: <InboxOutlined />,
              },
            ]}
          />

          <Form
            form={claimForm}
            layout="vertical"
            style={{ marginTop: '24px' }}
          >
            {/* Step 1: Patient Information */}
            {currentStep === 0 && (
              <div className="animate-fade-in">
                <Form.Item
                  label={<span style={{ color: '#000000', fontWeight: 600 }}>Claim ID</span>}
                  name="claimId"
                  rules={[
                    {
                      required: true,
                      message: 'Please input claim ID!',
                    },
                  ]}
                >
                  <Input
                    placeholder="Enter claim ID"
                    size="large"
                    style={{
                      borderRadius: '8px',
                      border: '2px solid #e5e7eb',
                    }}
                  />
                </Form.Item>

                <Form.Item
                  label={<span style={{ color: '#000000', fontWeight: 600 }}>Patient Name</span>}
                  name="patientName"
                  rules={[
                    {
                      required: true,
                      message: 'Please input patient name!',
                    },
                  ]}
                >
                  <Input
                    prefix={<UserOutlined style={{ color: '#667eea' }} />}
                    placeholder="Enter patient name"
                    size="large"
                    style={{
                      borderRadius: '8px',
                      border: '2px solid #e5e7eb',
                    }}
                  />
                </Form.Item>

                <Form.Item
                  label={<span style={{ color: '#000000', fontWeight: 600 }}>Patient Mobile Number</span>}
                  name="patientMobile"
                  rules={[
                    {
                      required: true,
                      message: 'Please input mobile number!',
                    },
                    {
                      pattern: /^[0-9]{10}$/,
                      message: 'Please enter valid 10 digit mobile number!',
                    },
                  ]}
                >
                  <Input
                    placeholder="Enter 10 digit mobile number"
                    size="large"
                    maxLength={10}
                    style={{
                      borderRadius: '8px',
                      border: '2px solid #e5e7eb',
                    }}
                  />
                </Form.Item>

                <Form.Item
                  label={<span style={{ color: '#000000', fontWeight: 600 }}>Hospital City</span>}
                  name="hospitalCity"
                  rules={[
                    {
                      required: true,
                      message: 'Please input hospital city!',
                    },
                  ]}
                >
                  <Input
                    placeholder="Enter hospital city"
                    size="large"
                    style={{
                      borderRadius: '8px',
                      border: '2px solid #e5e7eb',
                    }}
                  />
                </Form.Item>

                <Form.Item
                  label={<span style={{ color: '#000000', fontWeight: 600 }}>Hospital State</span>}
                  name="hospitalState"
                  rules={[
                    {
                      required: true,
                      message: 'Please select hospital state!',
                    },
                  ]}
                >
                  <Select
                    placeholder="Select hospital state"
                    size="large"
                    showSearch
                    style={{
                      borderRadius: '8px',
                    }}
                    options={indianStates.map(state => ({ label: state, value: state }))}
                  />
                </Form.Item>

                <Form.Item
                  label={<span style={{ color: '#000000', fontWeight: 600 }}>Patient Language</span>}
                  name="patientLanguage"
                  rules={[
                    {
                      required: true,
                      message: 'Please select patient language!',
                    },
                  ]}
                >
                  <Select
                    placeholder="Select patient language"
                    size="large"
                    showSearch
                    style={{
                      borderRadius: '8px',
                    }}
                    options={languages.map(lang => ({ label: lang, value: lang }))}
                  />
                </Form.Item>

                <Form.Item style={{ marginBottom: 0, marginTop: '24px' }}>
                  <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                    <Button
                      onClick={handleClaimCancel}
                      size="large"
                      style={{
                        borderRadius: '8px',
                        height: '45px',
                        padding: '0 24px',
                        border: '2px solid #e5e7eb',
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="primary"
                      onClick={handleNextStep}
                      size="large"
                      style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none',
                        borderRadius: '8px',
                        height: '45px',
                        padding: '0 24px',
                        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                      }}
                    >
                      Next
                    </Button>
                  </Space>
                </Form.Item>
              </div>
            )}

            {/* Step 2: Upload Documents */}
            {currentStep === 1 && (
              <div className="animate-fade-in">
                <Form.Item
                  label={<span style={{ color: '#000000', fontWeight: 600, fontSize: '16px' }}>Upload Documents</span>}
                >
                  <Dragger
                    {...uploadProps}
                    style={{
                      borderRadius: '12px',
                      border: '3px dashed #667eea',
                      background: '#f9fafb',
                      padding: '20px',
                    }}
                  >
                    <p className="ant-upload-drag-icon">
                      <InboxOutlined style={{ fontSize: '64px', color: '#667eea' }} />
                    </p>
                    <p style={{ fontSize: '18px', fontWeight: 600, color: '#000000', margin: '16px 0 8px' }}>
                      Click or drag files to this area to upload
                    </p>
                    <p style={{ color: '#6b7280', fontSize: '14px', padding: '0 32px' }}>
                      Support for single or bulk upload. You can upload PDF, images, or other document formats.
                      Drag and drop your files here or click to browse.
                    </p>
                  </Dragger>
                </Form.Item>

                {fileList.length > 0 && (
                  <div style={{
                    marginTop: '16px',
                    padding: '16px',
                    background: '#f0fdf4',
                    borderRadius: '8px',
                    border: '1px solid #10b981'
                  }}>
                    <Text strong style={{ color: '#059669', fontSize: '14px' }}>
                      {fileList.length} file(s) selected
                    </Text>
                  </div>
                )}

                <Form.Item style={{ marginBottom: 0, marginTop: '32px' }}>
                  <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                    <Button
                      onClick={handlePrevStep}
                      size="large"
                      style={{
                        borderRadius: '8px',
                        height: '45px',
                        padding: '0 24px',
                        border: '2px solid #e5e7eb',
                      }}
                    >
                      Previous
                    </Button>
                    <Button
                      type="primary"
                      onClick={handleCreateClaim}
                      loading={loading}
                      size="large"
                      style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none',
                        borderRadius: '8px',
                        height: '45px',
                        padding: '0 24px',
                        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                      }}
                    >
                      Create Claim
                    </Button>
                  </Space>
                </Form.Item>
              </div>
            )}
          </Form>
        </Modal>
      </div>
      </div>
    </ConfigProvider>
  );
}

export default Home;
