'''
Authentication and authorization assertion steps.
'''
from kedet.api import AuthResp, AuthParams, UserClaimParams
from kedet.model import User

from ..base import StepsContext, step
from ..fuzzy import make_valid_password
from .users import (
    admin_login, logout, asset_get_token, client_manager_login, invite_token_claim,
    invite_token, any_login
)

@step(needs=[logout])
def assert_logout_token_revoke(context: StepsContext):
    '''
    Assert logout revokes token.
    '''
    user_id = context.get_output(any_login, 'user_id')

    with context.expect_unauthorized():
        context.get('/users/' + user_id)

@step(needs=[asset_get_token])
def assert_asset_get_token_restriction(context: StepsContext):
    '''
    Assert a restricted token cannot be used for general authentication.
    '''
    context.authorization = context.get_output(asset_get_token, 'token')

    with context.expect_unauthorized():
        context.get('/clients')

@step(needs=[invite_token])
def assert_invite_token_restriction(context: StepsContext):
    '''
    Assert a user invite token cannot be used for general authentication.
    '''
    context.authorization = context.get_output(invite_token, 'token')

    with context.expect_unauthorized():
        context.get('/clients')

@step(needs=[admin_login, client_manager_login])
def assert_users_protected(context: StepsContext):
    '''
    Assert users are protected.
    '''
    with context.get_session() as session:
        admin = User.get_by_email(session, context.get_output(admin_login, 'email'))

    context.authorization = context.get_output(client_manager_login, 'token')

    with context.expect_unauthorized():
        context.get('/users/' + str(admin.id))

    with context.expect_unauthorized():
        context.get('/users')

@step(needs=[invite_token_claim])
def assert_invite_token_claim(context: StepsContext):
    '''
    Assert the user claim flow results in a state allowing login.
    '''
    email = context.get_output(invite_token_claim, 'email')
    password = context.get_output(invite_token_claim, 'password')

    context.authorization = None

    resp: AuthResp = context.post(
        '/auth',
        AuthParams(
            email=email,
            password=password
        )
    )

    if resp.auth.user_id != context.get_output(invite_token_claim, 'user_id'):
        context.fail('User ID does not match')

@step(needs=[invite_token_claim])
def assert_invite_token_lockout(context: StepsContext):
    '''
    Assert a user invite token cannot be used more than once.
    '''
    context.authorization = None

    with context.expect_invalid():
        context.post(
            '/invites',
            UserClaimParams(
                invite_token=context.get_output(invite_token, 'token'),
                password=make_valid_password()
            )
        )
