"""
Initial.

Revision ID: 657aaca91df5
Revises: 
Create Date: 2026-03-05 16:20:15.001912
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '657aaca91df5'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    """
    Upgrade schema.
    """
    op.create_table(
        'realms',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('type', sa.Enum('INSTANCE', name='realmtype'), nullable=False),
        sa.Column('parent_id', sa.Uuid(), nullable=True),
        sa.Column('name', sa.String(length=30), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(
        op.f('ix_realms_parent_id'), 'realms', ['parent_id'], unique=False
    )

    op.create_table(
        'users',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('email', sa.String(length=60), nullable=False),
        sa.Column('name', sa.String(length=30), nullable=False),
        sa.Column('password_digest', sa.String(length=60), nullable=True),
        sa.Column('locale', sa.String(length=5), nullable=False),
        sa.Column('deactivated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(
        op.f('ix_users_email'), 'users', ['email'], unique=True
    )

    op.create_table(
        'audits',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('occurred_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('target_type', sa.String(length=64), nullable=False),
        sa.Column('target_id', sa.Uuid(), nullable=False),
        sa.Column('event', sa.String(length=60), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(
        'ix_audit_target', 'audits', ['target_type', 'target_id'], unique=False
    )
    op.create_index(
        op.f('ix_audits_occurred_at'), 'audits', ['occurred_at'], unique=False
    )

    op.create_table(
        'auth_keys',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('token_digest', sa.String(length=112), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('restriction', sa.Enum('EMAIL_CONFIRM', 'PASSWORD_RESET', name='authkeyrestriction'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(
        'ix_auth_keys_user_id_token_digest_expires_at', 'auth_keys',
        ['user_id', 'token_digest', 'expires_at'], unique=False
    )

    op.create_table(
        'notifications',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('cause_user_id', sa.UUID(), nullable=True),
        sa.Column('occurred_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('seen_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('type', sa.Enum('CONFIRM_EMAIL', 'PASSWORD_RESET', name='notificationtype'), nullable=False),
        sa.Column('email_status', sa.Enum('PENDING', 'SKIPPED', 'ERROR', 'SENT', name='notificationemailstatus'), nullable=False),
        sa.Column('cosmetic_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('target_type', sa.String(length=64), nullable=True),
        sa.Column('target_id', sa.Uuid(), nullable=True),
        sa.ForeignKeyConstraint(['cause_user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(
        op.f('ix_notifications_email_status'), 'notifications',
        ['email_status'], unique=False
    )
    op.create_index(
        op.f('ix_notifications_occurred_at'), 'notifications',
        ['occurred_at'], unique=False
    )
    op.create_index(
        op.f('ix_notifications_user_id'), 'notifications',
        ['user_id'], unique=False
    )

    op.create_table(
        'uploads',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('realm_id', sa.UUID(), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('content_type', sa.String(length=60), nullable=False),
        sa.Column('size', sa.Integer(), nullable=False),
        sa.Column('type', sa.Enum('DEFAULT', name='uploadtype'), nullable=False),
        sa.ForeignKeyConstraint(['realm_id'], ['realms.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'user_roles',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('realm_id', sa.UUID(), nullable=True),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('role', sa.Enum('ADMIN', 'USER', name='role'), nullable=False),
        sa.ForeignKeyConstraint(['realm_id'], ['realms.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(
        'ix_user_grant_user_id_deleted_at', 'user_roles',
        ['user_id', 'deleted_at'], unique=False
    )
    op.create_index(
        op.f('ix_user_roles_user_id'), 'user_roles', ['user_id'], unique=False
    )

def downgrade() -> None:
    """
    Downgrade schema.
    """
    op.drop_index(op.f('ix_user_roles_user_id'), table_name='user_roles')
    op.drop_index('ix_user_grant_user_id_deleted_at', table_name='user_roles')
    op.drop_table('user_roles')
    op.drop_table('uploads')
    op.drop_index(op.f('ix_notifications_user_id'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_occurred_at'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_email_status'), table_name='notifications')
    op.drop_table('notifications')
    op.drop_index('ix_auth_keys_user_id_token_digest_expires_at', table_name='auth_keys')
    op.drop_table('auth_keys')
    op.drop_index(op.f('ix_audits_occurred_at'), table_name='audits')
    op.drop_index('ix_audit_target', table_name='audits')
    op.drop_table('audits')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
    op.drop_index(op.f('ix_realms_parent_id'), table_name='realms')
    op.drop_table('realms')
