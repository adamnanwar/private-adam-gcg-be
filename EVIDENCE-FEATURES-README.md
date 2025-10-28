# Evidence and PIC Features Documentation

## Overview
Sistem GCG Maturity Assessment telah diperluas dengan fitur Evidence (upload dokumen) dan PIC (Person In Charge) assignment dengan notifikasi email.

## Fitur yang Ditambahkan

### 1. Evidence Management
- **Upload Multiple Documents**: Mendukung upload hingga 10 file sekaligus
- **Target Types**: 
  - `assessment_aspect` - Dokumen untuk aspek assessment
  - `assessment_parameter` - Dokumen untuk parameter assessment  
  - `assessment_factor` - Dokumen untuk faktor assessment
  - `aoi` - Dokumen untuk Area of Improvement
- **File Types**: PDF, Word, Excel, PowerPoint, Images, Text
- **File Size**: Maksimal 10MB per file
- **Notes**: Setiap dokumen dapat diberi catatan

### 2. PIC Assignment
- **Assessment PIC**: Assign PIC untuk aspek assessment
- **AOI PIC**: Assign PIC untuk Area of Improvement
- **Email Notification**: PIC akan menerima email notifikasi otomatis
- **Role-based Access**: Hanya admin/assessor yang dapat assign PIC

### 3. Email Notifications
- **PIC Assignment**: Notifikasi saat user di-assign sebagai PIC
- **AOI Assignment**: Notifikasi khusus untuk AOI
- **Assessment PIC**: Notifikasi untuk assessment assignment
- **SMTP Configuration**: Menggunakan server email PLN Batam

## Database Schema

### Evidence Table
```sql
CREATE TABLE evidence (
    id UUID PRIMARY KEY,
    target_type VARCHAR(50) NOT NULL,
    target_id UUID NOT NULL,
    kind VARCHAR(20) NOT NULL,
    uri TEXT NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    note TEXT,
    uploaded_by UUID NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### PIC Map Table
```sql
CREATE TABLE pic_map (
    id UUID PRIMARY KEY,
    target_type VARCHAR(50) NOT NULL,
    target_id UUID NOT NULL,
    pic_user_id UUID NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

## API Endpoints

### Evidence Endpoints
- `GET /api/v1/evidence` - Get all evidence
- `GET /api/v1/evidence/:id` - Get evidence by ID
- `GET /api/v1/evidence/target/:target_type/:target_id` - Get evidence by target
- `POST /api/v1/evidence/upload/:target_type/:target_id` - Upload evidence files
- `PUT /api/v1/evidence/:id` - Update evidence note
- `DELETE /api/v1/evidence/:id` - Delete evidence
- `GET /api/v1/evidence/:id/download` - Download evidence file
- `GET /api/v1/evidence/stats/statistics` - Get evidence statistics

### PIC Assignment Endpoints
- `POST /api/v1/aoi/:id/assign-pic` - Assign PIC to AOI
- `GET /api/v1/aoi/:id/pic-assignments` - Get PIC assignments for AOI

## Environment Configuration

### Production Environment
File: `env.production`
```bash
# LDAP Configuration
LDAP_HOSTS=batamdc1.plnbatam.com
LDAP_BASE_DN=DC=plnbatam,DC=com
LDAP_ACCOUNT_SUFFIX=@plnbatam.com
LDAP_PORT=389
LDAP_USE_TLS=false
LDAP_TIMEOUT_MS=8000
LDAP_UID_ATTR=sAMAccountName
LDAP_EMAIL_ATTR=mail
LDAP_NAME_ATTR=displayName

# Mail Configuration
MAIL_MAILER=smtp
MAIL_HOST=brightmail.plnbatam.com
MAIL_PORT=587
MAIL_USERNAME=adminit@plnbatam.com
MAIL_PASSWORD=P@ssw0rdIT
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS=no-reply@plnbatam.com
MAIL_FROM_NAME="Aplikasi Meeting Monitoring"
MAIL_TLS_REJECT_UNAUTHORIZED=false

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
```

## Installation Steps

### 1. Install Dependencies
```bash
cd backend
./install-dependencies.bat
```

### 2. Run Database Migrations
```bash
cd backend
./run-migration-evidence.bat
```

### 3. Create Upload Directory
```bash
mkdir uploads
```

### 4. Test Features
```bash
cd backend
node test-evidence-features.js
```

## Usage Examples

### Upload Evidence untuk Assessment Aspect
```javascript
const formData = new FormData();
formData.append('files', file1);
formData.append('files', file2);
formData.append('notes', JSON.stringify(['Note 1', 'Note 2']));

await axios.post('/api/v1/evidence/upload/assessment_aspect/aspect-id', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
```

### Assign PIC untuk AOI
```javascript
await axios.post('/api/v1/aoi/aoi-id/assign-pic', {
  pic_user_id: 'user-uuid'
});
```

### Get Evidence untuk Target
```javascript
const evidence = await axios.get('/api/v1/evidence/target/aoi/aoi-id');
```

## Security Features

### File Upload Security
- File type validation
- File size limits
- Secure file storage
- Access control via roles

### Authentication & Authorization
- JWT token required
- Role-based access control
- PIC can only access assigned items

### Email Security
- SMTP authentication
- TLS support
- Rate limiting

## Monitoring & Logging

### File Operations
- Upload/download logging
- File access tracking
- Error logging for failed operations

### Email Notifications
- Success/failure logging
- Delivery confirmation
- Rate limit monitoring

## Troubleshooting

### Common Issues
1. **File Upload Fails**: Check file size and type
2. **Email Not Sent**: Verify SMTP configuration
3. **PIC Assignment Fails**: Check user permissions
4. **Database Errors**: Ensure migrations are run

### Debug Commands
```bash
# Test email connection
node -e "require('./src/services/email.service').testConnection()"

# Check evidence directory
ls -la uploads/

# Test database connection
node test-db-connection.js
```

## Future Enhancements

### Planned Features
- File versioning
- Bulk PIC assignment
- Email templates customization
- File preview
- Advanced search and filtering
- Audit trail for file operations

### Performance Optimizations
- File compression
- CDN integration
- Database query optimization
- Caching strategies
