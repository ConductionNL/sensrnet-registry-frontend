import jwt_decode from 'jwt-decode';
import { Component, OnInit } from '@angular/core';
import { UserService } from '../../services/user.service';
import { AlertService } from '../../services/alert.service';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-organization-users',
  templateUrl: './organization-users.component.html',
})
export class OrganizationUsersComponent implements OnInit {
  public form: FormGroup;
  public submitted = false;

  public noUsersSelectedMessage = $localize`:@@no.users:No users have been selected.`;
  public updateSuccessMessage = $localize`:@@user.update:Update success.`;

  public userId;
  public users = [];
  public subscriptions = [];

  constructor(
    private alertService: AlertService,
    private readonly formBuilder: FormBuilder,
    private readonly userService: UserService,
    private readonly oidcSecurityService: OidcSecurityService,
  ) {}

  get f() {
    return this.form.controls;
  }

  async getUsers() {
    this.users = await this.userService.retrieve().toPromise() as Record<string, any>[];
  }

  selectUser(userId: string) {
    if (userId === this.form.get('userId').value) {
      this.form.patchValue({ userId: '' });
    } else {
      this.form.patchValue({ userId });
    }
  }

  setUserRole(user, role) {
    user.role = role;
  }

  async ngOnInit(): Promise<void> {
    this.form = this.formBuilder.group({
      userId: new FormControl('', Validators.required),
    });

    const token = this.oidcSecurityService.getIdToken();
    const decoded = jwt_decode(token) as any;
    this.userId = decoded.sub;

    await this.getUsers();
  }

  public async submit() {
    this.submitted = true;
    if (this.form.valid) {
      try {
        const userId = this.form.value.userId;
        const selectedUsers = this.users.filter(x => x._id === userId);
        if (selectedUsers.length) {
          for (const user of selectedUsers) {
            const userUpdate: Record<string, any> = {role: Number(user.role)};
            await this.userService.updateById(this.form.value.userId, userUpdate).toPromise();
          }
          this.alertService.success(this.updateSuccessMessage);
        } else {
          this.alertService.error(this.noUsersSelectedMessage);
        }
      } catch (e) {
        this.alertService.error(e.error.message);
      }
    }
    this.submitted = false;
  }
}
