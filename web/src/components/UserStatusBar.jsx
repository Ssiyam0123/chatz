import Image from 'next/image'
import React from 'react'

const UserStatusBar = () => {
    const user = {
        profileImage : "",
        username : "siyam",
        status : true
    }
  return (
    <div>
        <div className='border-2 '>
            {/* <Imag src='../../public/avatar.png' height={30} width={30}/> */}
            <div>
                <p>{user.username}</p>
                <p>{user.status}</p>
            </div>
        </div>
    </div>
  )
}

export default UserStatusBar