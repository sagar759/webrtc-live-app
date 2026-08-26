import React, { useState, useEffect, useRef } from 'react';
import { Modal, Input, Button, Space, Typography, Tag, Spin, message } from 'antd';
import { SearchOutlined, CompassOutlined, CheckCircleOutlined, EnvironmentOutlined } from '@ant-design/icons';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const { Text } = Typography;

// Fix Leaflet's default icon path in bundlers like Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const LocationPickerModal = ({
  visible,
  onClose,
  onConfirm,
  locationType = 'doctor',
  initialCoords = null,
  userName = ''
}) => {
  const [coords, setCoords] = useState(initialCoords || { latitude: 20.5937, longitude: 78.9629, accuracy: null });
  const [address, setAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [saving, setSaving] = useState(false);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  // Initialize or update coordinates when modal opens
  useEffect(() => {
    if (visible) {
      if (initialCoords && initialCoords.latitude && initialCoords.longitude) {
        setCoords(initialCoords);
        fetchReverseGeocode(initialCoords.latitude, initialCoords.longitude);
      } else {
        detectGpsLocation();
      }
    }
  }, [visible]);

  // Setup Leaflet map instance
  useEffect(() => {
    if (!visible || !mapContainerRef.current) return;

    // Destroy existing instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const initialLat = coords.latitude || 20.5937;
    const initialLng = coords.longitude || 78.9629;
    const zoomLevel = coords.latitude ? 16 : 5;

    const map = L.map(mapContainerRef.current).setView([initialLat, initialLng], zoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    const customIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    const marker = L.marker([initialLat, initialLng], {
      draggable: true,
      icon: customIcon
    }).addTo(map);

    marker.bindPopup(`<b>${locationType.toUpperCase()} Location</b><br/>Drag to adjust pinpoint`).openPopup();

    marker.on('dragend', () => {
      const position = marker.getLatLng();
      const newLat = position.lat;
      const newLng = position.lng;
      setCoords(prev => ({ ...prev, latitude: newLat, longitude: newLng, accuracy: 5 }));
      fetchReverseGeocode(newLat, newLng);
    });

    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      setCoords(prev => ({ ...prev, latitude: lat, longitude: lng, accuracy: 5 }));
      fetchReverseGeocode(lat, lng);
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    // Invalidate size after modal renders to ensure full-width map
    setTimeout(() => {
      map.invalidateSize();
    }, 300);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [visible]);

  // Update map center and marker when coords change from search or GPS
  const updateMapPosition = (lat, lng, zoom = 16) => {
    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([lat, lng], zoom);
      markerRef.current.setLatLng([lat, lng]);
    }
  };

  // Reverse Geocoding helper using Nominatim
  const fetchReverseGeocode = async (lat, lng) => {
    setGeocoding(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
        headers: {
          'Accept-Language': 'en'
        }
      });
      const data = await res.json();
      if (data && data.display_name) {
        setAddress(data.display_name);
      } else {
        setAddress(`Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`);
      }
    } catch (err) {
      console.warn('Reverse geocoding error:', err);
      setAddress(`Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } finally {
      setGeocoding(false);
    }
  };

  // High Accuracy GPS auto-detection
  const detectGpsLocation = () => {
    if (!navigator.geolocation) {
      message.error('Geolocation is not supported by your browser');
      return;
    }

    setDetectingGps(true);
    message.loading({ content: '📡 Acquiring high-precision GPS lock...', key: 'gpsLock', duration: 2 });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDetectingGps(false);
        const { latitude, longitude, accuracy } = position.coords;
        const newCoords = { latitude, longitude, accuracy: Math.round(accuracy) };
        setCoords(newCoords);
        updateMapPosition(latitude, longitude, 17);
        fetchReverseGeocode(latitude, longitude);
        message.success({
          content: `🎯 GPS Locked! Accuracy: within ±${Math.round(accuracy)}m`,
          key: 'gpsLock',
          duration: 3
        });
      },
      (error) => {
        setDetectingGps(false);
        console.warn('GPS detection warning:', error);
        let errorMsg = 'Could not acquire precise GPS signal.';
        if (error.code === 1) errorMsg = 'Location permission denied. Please allow location access in your browser.';
        else if (error.code === 2) errorMsg = 'GPS unavailable. You can search your clinic/address or drag the map pin.';
        else if (error.code === 3) errorMsg = 'GPS timeout. You can search your address or drag the pin.';
        message.info({ content: errorMsg, key: 'gpsLock', duration: 4 });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  // Search address / landmark using OpenStreetMap Nominatim
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery.trim())}&limit=5&addressdetails=1`, {
        headers: {
          'Accept-Language': 'en'
        }
      });
      const results = await res.json();
      setSearchResults(results || []);
      if (!results || results.length === 0) {
        message.warning('No matching locations found. Try searching with city or landmark name.');
      }
    } catch (err) {
      console.error('Search error:', err);
      message.error('Location search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectSearchResult = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setCoords({ latitude: lat, longitude: lng, accuracy: 10 });
    setAddress(result.display_name);
    setSearchResults([]);
    setSearchQuery('');
    updateMapPosition(lat, lng, 17);
    message.success('Map pin updated to selected location!');
  };

  const handleSave = async () => {
    if (!coords.latitude || !coords.longitude) {
      message.error('Please select a valid location on the map');
      return;
    }
    setSaving(true);
    try {
      await onConfirm({
        locationType,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy || 10,
        address: address || `Coordinates: ${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`
      });
      onClose();
    } catch (err) {
      console.error('Failed to confirm location:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <EnvironmentOutlined style={{ color: locationType === 'doctor' ? '#10b981' : '#ec4899', fontSize: '20px' }} />
          <span>
            Verify & Confirm {locationType === 'doctor' ? 'Doctor' : 'Patient'} Exact Location
          </span>
          <Tag color={locationType === 'doctor' ? 'green' : 'magenta'}>
            {locationType.toUpperCase()}
          </Tag>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={780}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={saving}>
          Cancel
        </Button>,
        <Button
          key="gps"
          icon={<CompassOutlined />}
          onClick={detectGpsLocation}
          loading={detectingGps}
        >
          Re-detect GPS
        </Button>,
        <Button
          key="confirm"
          type="primary"
          icon={<CheckCircleOutlined />}
          onClick={handleSave}
          loading={saving}
          style={{
            background: locationType === 'doctor' ? '#10b981' : '#ec4899',
            borderColor: locationType === 'doctor' ? '#10b981' : '#ec4899'
          }}
        >
          Confirm & Save Exact Location
        </Button>
      ]}
      styles={{
        body: { padding: '16px 24px' }
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Text type="secondary" style={{ fontSize: '13px' }}>
          💡 <b>Tip:</b> If on a laptop/Jio network without GPS, you can <b>search your clinic/hospital name</b> or <b>drag the red pin</b> directly to your exact spot on the map.
        </Text>

        {/* Address Search Bar */}
        <div style={{ position: 'relative' }}>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder="Search clinic, hospital, building, street, or city (e.g. Apollo Hospital, Mumbai)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onPressEnter={handleSearch}
              allowClear
              prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            />
            <Button type="primary" onClick={handleSearch} loading={searching}>
              Search
            </Button>
          </Space.Compact>

          {/* Search Dropdown Results */}
          {searchResults.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '42px',
                left: 0,
                right: 0,
                background: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                zIndex: 1000,
                maxHeight: '220px',
                overflowY: 'auto'
              }}
            >
              {searchResults.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectSearchResult(item)}
                  style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid #f3f4f6',
                    cursor: 'pointer',
                    fontSize: '13px',
                    lineHeight: '1.4',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f0fdf4')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                >
                  <EnvironmentOutlined style={{ color: '#10b981', marginRight: '8px' }} />
                  <b>{item.display_name.split(',')[0]}</b>
                  <div style={{ color: '#6b7280', fontSize: '11px', marginTop: '2px' }}>
                    {item.display_name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Interactive Leaflet Map Container */}
        <div
          ref={mapContainerRef}
          style={{
            width: '100%',
            height: '340px',
            borderRadius: '12px',
            border: '2px solid #e5e7eb',
            overflow: 'hidden',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)'
          }}
        />

        {/* Coords & Address Info Card */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <Space>
              <Tag color="blue">Lat: {coords.latitude ? Number(coords.latitude).toFixed(6) : 'N/A'}</Tag>
              <Tag color="cyan">Long: {coords.longitude ? Number(coords.longitude).toFixed(6) : 'N/A'}</Tag>
              {coords.accuracy && <Tag color="green">Accuracy: ±{coords.accuracy}m</Tag>}
            </Space>
            {geocoding && <Spin size="small" />}
          </div>

          <div style={{ fontSize: '13px', color: '#334155' }}>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>📍 Verified Address: </span>
            <span>{address || 'Fetching address for pinpointed coordinates...'}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default LocationPickerModal;
