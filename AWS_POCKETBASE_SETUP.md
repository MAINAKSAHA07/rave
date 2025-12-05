# PocketBase Docker Setup on AWS - Complete

## ✅ Status

PocketBase is now running in Docker on AWS server `13.201.90.240`:

- **Docker Container**: Running and healthy
- **Port**: 8090 (standard Docker port)
- **Health Check**: ✅ Passing
- **Internal Access**: ✅ Working (`http://localhost:8090`)
- **External Access**: ⚠️ Needs AWS Security Group configuration

## 🔧 What Was Done

1. **Installed Docker** on Amazon Linux 2023
2. **Installed Docker Compose** (standalone version)
3. **Stopped old PocketBase binary** process
4. **Created docker-compose.yml** with PocketBase service
5. **Started PocketBase in Docker** container
6. **Verified health** - Container is healthy

## 📋 Current Configuration

### Docker Compose
- **Image**: `ghcr.io/muchobien/pocketbase:0.22.27`
- **Container Name**: `rave-pb`
- **Ports**: `8090:8090`
- **Volumes**: 
  - `./pocketbase/pb_data:/pb/pb_data` (database)
  - `./pocketbase/pb_migrations:/pb/pb_migrations` (migrations)
- **Health Check**: Enabled (checks `/api/health` every 10s)

### Access URLs
- **Internal**: `http://localhost:8090`
- **External**: `http://13.201.90.240:8090` (requires security group update)

## 🔒 AWS Security Group Configuration

To enable external access, you need to:

1. **Go to AWS Console** → EC2 → Security Groups
2. **Find the security group** attached to instance `13.201.90.240`
3. **Add Inbound Rule**:
   - **Type**: Custom TCP
   - **Port**: 8090
   - **Source**: `0.0.0.0/0` (or your specific IP for security)
   - **Description**: PocketBase API

Alternatively, use AWS CLI:
```bash
aws ec2 authorize-security-group-ingress \
  --group-id <your-security-group-id> \
  --protocol tcp \
  --port 8090 \
  --cidr 0.0.0.0/0
```

## 🚀 Management Commands

### Check Status
```bash
ssh -i ravem.pem ec2-user@13.201.90.240 "sudo docker ps | grep pocketbase"
```

### View Logs
```bash
ssh -i ravem.pem ec2-user@13.201.90.240 "cd /home/ec2-user/rave && sudo docker-compose logs -f pocketbase"
```

### Restart PocketBase
```bash
ssh -i ravem.pem ec2-user@13.201.90.240 "cd /home/ec2-user/rave && sudo docker-compose restart pocketbase"
```

### Stop PocketBase
```bash
ssh -i ravem.pem ec2-user@13.201.90.240 "cd /home/ec2-user/rave && sudo docker-compose stop pocketbase"
```

### Start PocketBase
```bash
ssh -i ravem.pem ec2-user@13.201.90.240 "cd /home/ec2-user/rave && sudo docker-compose up -d pocketbase"
```

### Create Backup
```bash
ssh -i ravem.pem ec2-user@13.201.90.240 "cd /home/ec2-user/rave && sudo docker-compose run --rm backup"
```

## 🔄 Migration from Binary to Docker

The old PocketBase binary process has been stopped. The data in `/home/ec2-user/rave/pocketbase/pb_data` is being used by the Docker container, so no data migration was needed.

## 📝 Environment Variables

If you need to set `PB_ENCRYPTION_KEY`, create a `.env` file in `/home/ec2-user/rave/`:

```bash
ssh -i ravem.pem ec2-user@13.201.90.240 "cd /home/ec2-user/rave && echo 'PB_ENCRYPTION_KEY=your-encryption-key-here' > .env"
```

Then restart the container:
```bash
ssh -i ravem.pem ec2-user@13.201.90.240 "cd /home/ec2-user/rave && sudo docker-compose up -d pocketbase"
```

## ✅ Verification

After configuring the security group, test external access:

```bash
curl http://13.201.90.240:8090/api/health
```

Expected response:
```json
{"message":"API is healthy.","code":200,"data":{"canBackup":true}}
```

## 🎯 Next Steps

1. **Configure AWS Security Group** to allow port 8090
2. **Update application environment variables** to use `http://13.201.90.240:8090`
3. **Test external connectivity** from your application
4. **Set up automated backups** (optional, using the backup service in docker-compose.yml)

## 📞 Troubleshooting

### Container not starting
```bash
ssh -i ravem.pem ec2-user@13.201.90.240 "cd /home/ec2-user/rave && sudo docker-compose logs pocketbase"
```

### Port already in use
```bash
ssh -i ravem.pem ec2-user@13.201.90.240 "sudo lsof -i :8090"
```

### Check container health
```bash
ssh -i ravem.pem ec2-user@13.201.90.240 "sudo docker ps --format 'table {{.Names}}\t{{.Status}}' | grep pocketbase"
```
