import type { AuthProvider, User, UUID } from '@cueup/shared';

export type UserAccount = User & {
  providerAccountId: string;
};

export interface UserRepository {
  findById(id: UUID): Promise<UserAccount | undefined>;
  findByProviderAccount(
    provider: AuthProvider,
    providerAccountId: string,
  ): Promise<UserAccount | undefined>;
  findActiveByEmail(email: string): Promise<UserAccount | undefined>;
  save(user: UserAccount): Promise<UserAccount>;
}

export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<UUID, UserAccount>();

  constructor(initialUsers: UserAccount[] = []) {
    for (const user of initialUsers) {
      this.users.set(user.id, user);
    }
  }

  async findById(id: UUID): Promise<UserAccount | undefined> {
    return this.users.get(id);
  }

  async findByProviderAccount(
    provider: AuthProvider,
    providerAccountId: string,
  ): Promise<UserAccount | undefined> {
    return [...this.users.values()].find(
      (user) => user.provider === provider && user.providerAccountId === providerAccountId,
    );
  }

  async findActiveByEmail(email: string): Promise<UserAccount | undefined> {
    const normalizedEmail = email.toLowerCase();

    return [...this.users.values()].find(
      (user) => user.deletedAt == null && user.email?.toLowerCase() === normalizedEmail,
    );
  }

  async save(user: UserAccount): Promise<UserAccount> {
    this.users.set(user.id, user);
    return user;
  }
}
