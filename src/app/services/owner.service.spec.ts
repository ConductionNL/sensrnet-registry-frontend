import { TestBed } from '@angular/core/testing';

import { OwnerService } from './owner.service';

describe('UserService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: OwnerService = TestBed.get(OwnerService);
    expect(service).toBeTruthy();
  });
});
