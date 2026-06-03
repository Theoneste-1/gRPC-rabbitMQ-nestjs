import { Observable } from 'rxjs';

export interface ParkingResponse {
  id: string;
  code: string;
  name: string;
  location: string;
  totalSpaces: number;
  availableSpaces: number;
  feePerHour: number;
  createdAt: string;
  updatedAt: string;
}

export interface ParkingGrpcClient {
  GetParkingByCode(data: { code: string }): Observable<ParkingResponse>;
  UpdateAvailableSpaces(data: { code: string; delta: number }): Observable<ParkingResponse>;
}

export interface UserResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export interface AuthGrpcClient {
  GetUserById(data: { userId: string }): Observable<UserResponse>;
}
